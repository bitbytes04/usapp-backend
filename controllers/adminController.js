const { db, auth, storage } = require("../firebase/config");
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
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
        // Get all users from Users, SLPUsers, DisabledUsers, and DisabledSLPUsers collections
        const [
            usersSnap,
            slpUsersSnap,
            disabledUsersSnap,
            disabledSLPUsersSnap
        ] = await Promise.all([
            db.collection('Users').get(),
            db.collection('SLPUsers').get(),
            db.collection('DisabledUsers').get(),
            db.collection('DisabledSLPUsers').get()
        ]);

        // Map active Users collection
        const users = usersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'user',
            status: 'active'
        }));

        // Map active SLPUsers collection
        const slpUsers = slpUsersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'slp',
            status: 'active'
        }));

        // Map DisabledUsers collection
        const disabledUsers = disabledUsersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'user',
            status: 'disabled'
        }));

        // Map DisabledSLPUsers collection
        const disabledSLPUsers = disabledSLPUsersSnap.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            role: 'slp',
            status: 'disabled'
        }));

        // Combine all arrays
        const allUsers = [
            ...users,
            ...slpUsers,
            ...disabledUsers,
            ...disabledSLPUsers
        ];

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
        // Fetch active SLP users
        const slpUsersSnapshot = await db.collection('SLPUsers').get();
        const slpUsers = slpUsersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            status: 'active'
        }));

        // Fetch disabled SLP users
        const disabledSLPUsersSnapshot = await db.collection('DisabledSLPUsers').get();
        const disabledSLPUsers = disabledSLPUsersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            status: 'disabled'
        }));

        // Combine both arrays
        const allSLPUsers = [...slpUsers, ...disabledSLPUsers];

        res.status(200).json({ success: true, users: allSLPUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const summarizeUserFeedback = async (req, res) => {
    try {
        // Fetch all feedback messages
        const feedbackSnapshot = await db.collection('UserFeedback').get();
        const messages = feedbackSnapshot.docs.map(doc => doc.data().message).filter(Boolean);

        if (messages.length === 0) {
            return res.status(200).json({ success: true, summary: "No feedback messages found." });
        }

        // Prepare prompt for GPT-4 mini
        const prompt = `Summarize the following user feedback messages in a concise paragraph:\n\n${messages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview", // GPT-4 mini
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes user feedback for product improvement." },
                { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.5
        });

        const summary = completion.choices[0].message.content.trim();

        res.status(200).json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Disable a user by moving their data from Users to DisabledUsers collection
 */
const disableUser = async (req, res) => {
    const { uid } = req.params;
    try {
        // Try to get user from Users collection
        const userDoc = await db.collection('Users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();

            // Add user data to DisabledUsers collection
            await db.collection('DisabledUsers').doc(uid).set({
                ...userData,
                disabledAt: new Date()
            });

            // Delete user from Users collection
            await db.collection('Users').doc(uid).delete();

            // Disable user in Firebase Authentication
            await auth.updateUser(uid, { disabled: true });

            return res.status(200).json({ success: true, message: 'User disabled successfully' });
        }

        // If not found in Users, check SLPUsers
        const slpUserDoc = await db.collection('SLPUsers').doc(uid).get();
        if (slpUserDoc.exists) {
            const slpUserData = slpUserDoc.data();

            // Add SLP user data to DisabledSLPUsers collection
            await db.collection('DisabledSLPUsers').doc(uid).set({
                ...slpUserData,
                disabledAt: new Date()
            });

            // Delete user from SLPUsers collection
            await db.collection('SLPUsers').doc(uid).delete();

            // Disable user in Firebase Authentication
            await auth.updateUser(uid, { disabled: true });

            return res.status(200).json({ success: true, message: 'SLP user disabled successfully' });
        }

        // Not found in either collection
        return res.status(404).json({ success: false, message: 'User not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * Enable a user by moving their data from DisabledUsers to Users collection
 */
const enableUser = async (req, res) => {
    const { uid } = req.params;
    try {
        // Try to get user data from DisabledUsers collection
        const disabledUserDoc = await db.collection('DisabledUsers').doc(uid).get();
        if (disabledUserDoc.exists) {
            const userData = disabledUserDoc.data();

            // Add user data back to Users collection
            await db.collection('Users').doc(uid).set({
                ...userData,
                enabledAt: new Date()
            });

            // Delete user from DisabledUsers collection
            await db.collection('DisabledUsers').doc(uid).delete();

            // Enable user in Firebase Authentication
            await auth.updateUser(uid, { disabled: false });

            return res.status(200).json({ success: true, message: 'User enabled successfully' });
        }

        // If not found in DisabledUsers, check DisabledSLPUsers
        const disabledSLPUserDoc = await db.collection('DisabledSLPUsers').doc(uid).get();
        if (disabledSLPUserDoc.exists) {
            const slpUserData = disabledSLPUserDoc.data();

            // Add SLP user data back to SLPUsers collection
            await db.collection('SLPUsers').doc(uid).set({
                ...slpUserData,
                enabledAt: new Date()
            });

            // Delete user from DisabledSLPUsers collection
            await db.collection('DisabledSLPUsers').doc(uid).delete();

            // Enable user in Firebase Authentication
            await auth.updateUser(uid, { disabled: false });

            return res.status(200).json({ success: true, message: 'SLP user enabled successfully' });
        }

        // Not found in either collection
        return res.status(404).json({ success: false, message: 'Disabled user not found' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


/**
 * Get all user feedbacks from UserFeedbacks collection
 */
const getAllUserFeedbacks = async (req, res) => {
    try {
        const feedbackSnapshot = await db.collection('UserFeedbacks').orderBy('timestamp', 'desc').get();
        const feedbacks = feedbackSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.status(200).json({ success: true, feedbacks });
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
    adminLogin,
    summarizeUserFeedback,
    disableUser,
    enableUser,
    getAllUserFeedbacks
};