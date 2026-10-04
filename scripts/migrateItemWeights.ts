// One-off migration: light/heavy used to live in site_content/order_settings as
// two id lists. They are now a signed `weight` on each menu item, so this copies
// the old lists onto the items themselves and drops the lists.
//
//   light item -> weight -1  (2 qty count as 1 ... weight 1 = 1 qty, so -1 keeps
//                              today's floor(qty / lightItemThreshold) exactly)
//   heavy item -> weight  3  (today every heavy qty counted as 3 units)
//
// Dry run by default. Pass --apply to write.
//
// Phase 1 (now, additive — the deployed app keeps working off the old lists):
//   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/adminsdk.json node scripts/migrateItemWeights.ts --apply
//
// Phase 2 (only after the new code is deployed, since the old code reads the lists):
//   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/adminsdk.json node scripts/migrateItemWeights.ts --apply --drop-old-lists

import fs from "fs";
import admin from "firebase-admin";
import type { DocumentReference } from "firebase-admin/firestore";

interface FirebaseRc {
    projects?: Record<string, string>;
    targets?: { default?: string };
}

interface ServiceAccount {
    project_id?: string;
    [key: string]: unknown;
}

interface MenuItemDoc {
    id: string;
    name?: string;
    weight?: number | string | null;
}

const LIGHT_WEIGHT = -1;
const HEAVY_WEIGHT = 3;
const APPLY = process.argv.includes("--apply");
const DROP_OLD_LISTS = process.argv.includes("--drop-old-lists");

const ORDER_SETTINGS_PATH = "site_content/order_settings";

// A service account key knows its own project. Application-default credentials
// don't, and `firebase use` picks one of the .firebaserc projects implicitly —
// so in that case the script has to be told which one.
function resolveProjectId() {
    let rc: FirebaseRc = {};
    try {
        rc = JSON.parse(fs.readFileSync(".firebaserc", "utf-8"));
    } catch {
        // No .firebaserc — fall through to the error below.
    }
    const projects = Object.entries(rc.projects || {});
    if (projects.length === 1) return projects[0][1];
    if (rc.targets?.default) return projects.find(([alias]) => alias === rc.targets!.default)?.[1];

    const candidates = projects.map(([alias, id]) => `  ${alias}: ${id}`).join("\n");
    console.error("Set FIREBASE_PROJECT_ID to the project you want to migrate.");
    if (candidates) console.error(`Projects in .firebaserc:\n${candidates}`);
    process.exit(1);
}

function loadServiceAccount(): ServiceAccount | null {
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!path) return null;
    try {
        return JSON.parse(fs.readFileSync(path, "utf-8"));
    } catch (error) {
        console.error(`Could not read ${path}: ${(error as Error).message}`);
        process.exit(1);
    }
}

function initAdmin(projectId: string | undefined, serviceAccount: ServiceAccount | null) {
    try {
        if (serviceAccount) {
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
                projectId,
            });
        }
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId,
        });
    } catch (error) {
        const source = serviceAccount
            ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            : "GOOGLE_APPLICATION_CREDENTIALS";
        console.error(`Could not authenticate with ${source}: ${(error as Error).message}`);
        process.exit(1);
    }
}

// Application default: GOOGLE_APPLICATION_CREDENTIALS, gcloud, or the metadata
// server. Without any of those, say so now rather than failing on a Firestore
// call with "Unable to detect a Project Id".
const serviceAccount = loadServiceAccount();
if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("No credentials found. Either of these will work:\n");
    console.error(
        "  FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/adminsdk.json node scripts/migrateItemWeights.ts"
    );
    console.error(
        "  FIREBASE_PROJECT_ID=pumato-84497 GOOGLE_APPLICATION_CREDENTIALS=/path/to/adminsdk.json node scripts/migrateItemWeights.ts"
    );
    console.error("\nDownload a service account key from:");
    console.error("  https://console.firebase.google.com/project/");
    console.error("  → Project settings → Service accounts → Generate new private key\n");
    process.exit(1);
}

const PROJECT_ID =
    process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id || resolveProjectId();
if (serviceAccount?.project_id && process.env.FIREBASE_PROJECT_ID) {
    if (serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID) {
        console.error(
            `Key is for ${serviceAccount.project_id} but FIREBASE_PROJECT_ID says ${process.env.FIREBASE_PROJECT_ID}.`
        );
        process.exit(1);
    }
}
initAdmin(PROJECT_ID, serviceAccount);
const db = admin.firestore();
console.log(`\nTarget project: ${PROJECT_ID}`);

const plan: Record<"light" | "heavy" | "alreadyWeighted" | "missing", string[]> = {
    light: [],
    heavy: [],
    alreadyWeighted: [],
    missing: [],
};

(async () => {
    const settingsRef = db.doc(ORDER_SETTINGS_PATH);
    const settingsDoc = await settingsRef.get();
    if (!settingsDoc.exists) {
        console.error("No site_content/order_settings document found.");
        process.exit(1);
    }

    const {
        lightItems = [],
        heavyItems = [],
        heavyItemCharge,
    } = settingsDoc.data() as {
        lightItems?: string[];
        heavyItems?: string[];
        heavyItemCharge?: unknown;
    };
    const light = new Set(lightItems);
    const heavy = new Set(heavyItems);

    console.log(`\nFound ${light.size} light item(s) and ${heavy.size} heavy item(s).`);

    const restaurants = await db.collection("restaurants").get();
    const writes: { ref: DocumentReference; menu: MenuItemDoc[] }[] = [];
    const seen = new Set<string>();

    restaurants.forEach((restDoc) => {
        const data = restDoc.data();
        const menu: MenuItemDoc[] = data.menu || [];
        let touched = 0;

        const nextMenu = menu.map((item) => {
            const isLight = light.has(item.id);
            const isHeavy = heavy.has(item.id);
            if (!isLight && !isHeavy) return item;
            seen.add(item.id);

            // Both lists: heavy wins, matching how the old calculator tallied them.
            const weight = isHeavy ? HEAVY_WEIGHT : LIGHT_WEIGHT;
            if (isLight && isHeavy) {
                console.warn(`  ! ${data.name} / ${item.name} was in both lists — using heavy.`);
            }

            if (item.weight !== undefined && item.weight !== null && item.weight !== "") {
                plan.alreadyWeighted.push(`${data.name} / ${item.name} (weight ${item.weight})`);
                return item;
            }

            (isHeavy ? plan.heavy : plan.light).push(`${data.name} / ${item.name}`);
            touched += 1;
            return { ...item, weight };
        });

        if (touched > 0) writes.push({ ref: restDoc.ref, menu: nextMenu });
    });

    plan.missing = [...light, ...heavy].filter((id) => !seen.has(id));

    const show = (title: string, entries: string[]) => {
        if (entries.length === 0) return;
        console.log(`\n${title} (${entries.length}):`);
        entries.forEach((entry) => console.log(`  - ${entry}`));
    };

    show(`Set weight ${LIGHT_WEIGHT} (light)`, plan.light);
    show(`Set weight ${HEAVY_WEIGHT} (heavy)`, plan.heavy);
    show("Left alone — already has a weight", plan.alreadyWeighted);
    if (plan.missing.length > 0) {
        console.log(`\nReferenced but no longer in any menu (${plan.missing.length}):`);
        plan.missing.forEach((id) => console.log(`  - ${id}`));
    }
    if (heavyItemCharge) {
        console.log(`\nNote: heavyItemCharge (${heavyItemCharge}) was never read by the`);
        console.log(
            DROP_OLD_LISTS
                ? "calculator, so dropping it changes nothing."
                : "calculator, and is left in place for now."
        );
    }

    if (!APPLY) {
        console.log(`\nDry run — ${writes.length} restaurant(s) would be updated.`);
        if (DROP_OLD_LISTS) {
            console.log("Would also remove lightItems / heavyItems / heavyItemCharge.");
        } else {
            console.log("Old lists would be left in place — the deployed app still reads them.");
        }
        console.log("Re-run with --apply to write.\n");
        process.exit(0);
    }

    for (const { ref, menu } of writes) {
        await ref.update({ menu });
    }

    if (DROP_OLD_LISTS) {
        await settingsRef.update({
            lightItems: admin.firestore.FieldValue.delete(),
            heavyItems: admin.firestore.FieldValue.delete(),
            heavyItemCharge: admin.firestore.FieldValue.delete(),
        });
        console.log(
            `\n✅ Updated ${writes.length} restaurant(s), removed lightItems / heavyItems / heavyItemCharge.`
        );
    } else {
        console.log(`\n✅ Updated ${writes.length} restaurant(s). Old lists left in place.`);
        console.log("\nNow deploy the new code, then finish with:\n");
        console.log("  node scripts/migrateItemWeights.ts --apply --drop-old-lists\n");
        console.log("Until then, a partner editing a menu on the old admin will strip the");
        console.log("new weight field, since the old zod schema drops unknown keys.\n");
    }
    console.log("Tune each item's Delivery Weight in the admin menu editor.\n");
    process.exit(0);
})().catch((error) => {
    console.error("Migration failed:", (error as Error).message);
    process.exit(1);
});
