const admin = require("firebase-admin");
const serviceAccount = require("./pumato-84497-firebase-adminsdk-fbsvc-6fc31148e4.json");

/*
  Usage: node createPartner.js <email> <password> <restaurantId>
*/

if (process.argv.length < 5) {
    console.error("Usage: node createPartner.js <email> <password> <restaurantId>");
    process.exit(1);
}

const [, , email, password, restaurantId] = process.argv;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

(async () => {
    try {
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`User ${email} already exists. Updating claims...`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating new user ${email}...`);
                user = await admin.auth().createUser({
                    email,
                    password,
                });
            } else {
                throw error;
            }
        }

        await admin.auth().setCustomUserClaims(user.uid, {
            restaurantId: restaurantId,
            partner: true // Optional marker
        });

        console.log("Success! User setup complete.");
        console.log(`Email: ${email}`);
        console.log(`Restaurant ID: ${restaurantId}`);
        console.log("Custom claims set.");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        process.exit(0);
    }
})();
