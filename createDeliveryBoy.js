const admin = require("firebase-admin");
const serviceAccount = require("./pumato-84497-firebase-adminsdk-fbsvc-6fc31148e4.json");
const readline = require("readline");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

(async () => {
    try {
        const email = process.argv[2] || await askQuestion("Enter User Email: ");
        const password = process.argv[3] || await askQuestion("Enter User Password (min 6 chars): ");

        if (!email || !password || password.length < 6) {
            console.error("Invalid email or password (must be 6+ chars).");
            process.exit(1);
        }

        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
            console.log(`\nUser ${email} already exists. Updating claims...`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log(`\nCreating new user ${email}...`);
                user = await admin.auth().createUser({
                    email,
                    password,
                });
            } else {
                throw error;
            }
        }

        await admin.auth().setCustomUserClaims(user.uid, {
            deliveryBoy: true
        });

        console.log("\n✅ Success! Delivery Boy account configured.");
        console.log(`User: ${email}`);
        console.log("Custom claims set: { deliveryBoy: true }");
        console.log("They can now login at /delivery-boy");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
        process.exit(0);
    }
})();
