const admin = require("firebase-admin");
const serviceAccount = require("./firebaseServiceAccount.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
}, 'firebase-admin-app');


const db = admin.firestore();
const storage = admin.storage().bucket();


module.exports = { admin, db, storage };
