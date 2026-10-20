import admin from "firebase-admin";
import type { UserRecord } from "firebase-admin/auth";
import { grantRole } from "../functions/src/claims";
import fs from "fs";
import path from "path";
import readline from "readline";

const serviceAccount = JSON.parse(
    fs.readFileSync(
        path.resolve(process.cwd(), "test-pumato-firebase-adminsdk-fbsvc-c9312153a9.json"),
        "utf-8"
    )
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const askQuestion = (query: string) => {
    return new Promise<string>((resolve) => rl.question(query, resolve));
};

void (async () => {
    try {
        const email = process.argv[2] || (await askQuestion("Enter User Email: "));
        const password =
            process.argv[3] || (await askQuestion("Enter User Password (min 6 chars): "));

        if (!email || !password || password.length < 6) {
            console.error("Invalid email or password (must be 6+ chars).");
            process.exit(1);
        }

        let user: UserRecord;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`\nUser ${email} already exists. Updating claims...`);
        } catch (error) {
            if ((error as { code?: string }).code === "auth/user-not-found") {
                console.log(`\nCreating new user ${email}...`);
                user = await admin.auth().createUser({
                    email,
                    password,
                });
            } else {
                throw error;
            }
        }

        await admin
            .auth()
            .setCustomUserClaims(
                user.uid,
                grantRole(user.customClaims, { role: "deliveryPartner" })
            );

        console.log("\n✅ Success! Delivery Partner account configured.");
        console.log(`User: ${email}`);
        console.log("Claim added: deliveryPartner (other roles kept)");
        console.log("They can now login at /delivery-partner");
    } catch (error) {
        console.error("Error:", (error as Error).message);
    } finally {
        rl.close();
        process.exit(0);
    }
})();
