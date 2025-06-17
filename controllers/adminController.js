const { db, auth, storage } = require("../firebase/config");

// Check if auth is defined and throw an error if not


/**
 * Get all activity logs from Firestore
 */
const getActivityLogs = async (req, res) => {
    try {
        const logsSnapshot = await db.collection('ActivityLogs').orderBy('timestamp', 'desc').get();
        const logs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.status(200).json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get a single activity log by ID
 */
const getActivityLogById = async (req, res) => {
    const { id } = req.params;
    try {
        const logDoc = await db.collection('ActivityLogs').doc(id).get();
        if (!logDoc.exists) {
            return res.status(404).json({ success: false, message: 'Activity log not found' });
        }
        res.status(200).json({ success: true, log: { id: logDoc.id, ...logDoc.data() } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin login
 */
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Hardcoded admin credentials
        if (email === "bitbytes.dev@gmail.com" && password === "@Starbucks2024") {
            res.status(200).json({ success: true, message: 'Admin login successful', uid: 'Xbj293nhu394n4ud' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid credentials or user not found' });
    }
};


/**
 * Create Speech Pathologist account
 */
const createSpeechPathologist = async (req, res) => {
    const { email, password, displayName, firstName, lastName, clinicName, age } = req.body;
    try {
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });
        // Set custom claim for SLP
        await auth.setCustomUserClaims(userRecord.uid, { slp: true });
        // Add to SLPUsers collection in Firestore
        await db.collection('SLPUsers').doc(userRecord.uid).set({
            email,
            displayName,
            firstName,
            lastName,
            clinicName,
            age,
            role: 'slp',
            createdAt: new Date()
        });
        res.status(201).json({ success: true, message: 'Speech Pathologist account created', uid: userRecord.uid });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * View all users
 */
const getAllUsers = async (req, res) => {
    try {
        // Get all users from Users and SLPUsers collections
        const [usersSnap, slpUsersSnap] = await Promise.all([
            db.collection('Users').get(),
            db.collection('SLPUsers').get()
        ]);

        // Map Users collection
        const users = usersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'user'
        }));

        // Map SLPUsers collection
        const slpUsers = slpUsersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'slp'
        }));

        // Combine both arrays
        const allUsers = [...users, ...slpUsers];

        res.status(200).json({ success: true, users: allUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * View all Speech Pathologist users
 */
const getAllSLPUsers = async (req, res) => {
    try {
        const slpUsersSnapshot = await db.collection('SLPUsers').get();
        const slpUsers = slpUsersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
        res.status(200).json({ success: true, users: slpUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getActivityLogs,
    getActivityLogById,
    getAllSLPUsers,
    createSpeechPathologist,
    getAllUsers,
    adminLogin
};