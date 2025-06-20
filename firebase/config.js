const admin = require("firebase-admin");
const serviceAccount = require("./firebaseServiceAccount.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'usapp-b776a.firebasestorage.app'
    });
}

const db = admin.firestore();
const storage = admin.storage().bucket();
const auth = admin.auth();


module.exports = { admin, db, storage, auth };
