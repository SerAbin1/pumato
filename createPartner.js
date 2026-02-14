const admin = require("firebase-admin");
const serviceAccount = require("./pumato-84497-firebase-adminsdk-fbsvc-6fc31148e4.json");
const readline = require("readline");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

(async () => {
    try {
        console.log("Fetching restaurants...");
        const snapshot = await db.collection("restaurants").get();
        if (snapshot.empty) {
            console.log("No restaurants found.");
            process.exit(0);
        }

        const restaurants = [];
        snapshot.forEach(doc => {
            restaurants.push({ id: doc.id, ...doc.data() });
        });

        console.log("\nSelect a restaurant to assign an owner to:");
        restaurants.forEach((res, index) => {
            console.log(`${index + 1}. ${res.name || "Unknown Name"} (ID: ${res.id})`);
        });

        const selection = await askQuestion("\nEnter number: ");
        const index = parseInt(selection) - 1;

        if (isNaN(index) || index < 0 || index >= restaurants.length) {
            console.error("Invalid selection.");
            process.exit(1);
        }

        const selectedRestaurant = restaurants[index];
        console.log(`\nSelected: ${selectedRestaurant.name} (${selectedRestaurant.id})`);

        const email = await askQuestion("Enter User Email: ");
        const password = await askQuestion("Enter User Password (min 6 chars): ");

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
            restaurantId: selectedRestaurant.id,
            partner: true
        });

        console.log("\n✅ Success! Partner account configured.");
        console.log(`User: ${email}`);
        console.log(`Assigned Restaurant: ${selectedRestaurant.name}`);
        console.log("You can now login at /partner/login");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        rl.close();
        process.exit(0);
    }
})();
