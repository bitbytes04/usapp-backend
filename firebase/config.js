const admin = require("firebase-admin");
const serviceAccount = require("./firebaseServiceAccount.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'default-bucket'
    });
}

const db = admin.firestore();
const storage = admin.storage().bucket();


module.exports = { admin, db, storage };
