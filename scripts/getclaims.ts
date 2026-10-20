import admin from "firebase-admin";
// ...same serviceAccount + admin.initializeApp(...) as createAdmin.ts
import fs from "fs";
import path from "path";

const serviceAccount = JSON.parse(
    fs.readFileSync(
        path.resolve(
            process.cwd(),
            "../../Documents/Secrets/pumato-84497-firebase-adminsdk-fbsvc-c61b4d79fe.json"
        ),
        "utf-8"
    )
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const user = await admin.auth().getUserByEmail("baheej@pumato.online"); // or getUser(uid)
console.log(user.uid, user.customClaims ?? {});
process.exit(0);
