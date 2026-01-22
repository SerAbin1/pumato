const admin = require("firebase-admin");
const serviceAccount = require("./pumato-84497-firebase-adminsdk-fbsvc-6fc31148e4.json");

/*
  This script authenticates using a Firebase service account
  and sets a custom `admin: true` claim on a specific user.
*/
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "JHo1hrECYNPU1KTKFJfzbrHsHT52";

(async () => {
  await admin.auth().setCustomUserClaims(uid, { admin: true });

  const user = await admin.auth().getUser(uid);
  console.log("Custom claims:", user.customClaims);

  process.exit(0);
})();
