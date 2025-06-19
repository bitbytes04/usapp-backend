const { db, auth, storage } = require("../firebase/config");

/**
 * Tally total screen time for a user and present breakdown by activityType.
 */
exports.getScreenTimeSummary = async (req, res) => {
    const { uid } = req.params;
    try {
        const snapshot = await db.collection("ScreenTimeLogs")
            .where("userId", "==", uid)
            .get();

        let totalDuration = 0;
        const activityBreakdown = {};

        snapshot.forEach(doc => {
            const { duration, activityType } = doc.data();
            totalDuration += Number(duration) || 0;
            if (!activityBreakdown[activityType]) activityBreakdown[activityType] = 0;
            activityBreakdown[activityType] += Number(duration) || 0;
        });

        res.send({
            userId: uid,
            totalDuration,
            activityBreakdown
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * Tally total button presses for a user's board usage and present breakdown.
 */
exports.getBoardUsageSummary = async (req, res) => {
    const { uid } = req.params;
    try {
        const logsSnapshot = await db.collection("BoardLogs")
            .where("userId", "==", uid)
            .get();

        const buttonTotals = {};

        // For each log, sum up button presses from subcollection
        const logPromises = [];
        logsSnapshot.forEach(logDoc => {
            const btnPressesRef = logDoc.ref.collection("ButtonPresses");
            logPromises.push(
                btnPressesRef.get().then(btnSnapshot => {
                    btnSnapshot.forEach(btnDoc => {
                        const { buttonId, count } = btnDoc.data();
                        if (!buttonTotals[buttonId]) buttonTotals[buttonId] = 0;
                        buttonTotals[buttonId] += Number(count) || 0;
                    });
                })
            );
        });

        await Promise.all(logPromises);

        res.send({
            userId: uid,
            buttonTotals
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * Post a link request to a user's LinkRequests subcollection using the target user's email.
 * Includes the SLP's display name in the request.
 */
exports.postLinkRequest = async (req, res) => {
    const { uid } = req.params; // The user who is sending the request
    const { targetEmail } = req.body; // The email of the user to link to

    if (!targetEmail) {
        return res.status(400).send({ error: "targetEmail is required" });
    }

    try {
        // Find the user with the given email
        const userSnapshot = await db.collection("Users")
            .where("email", "==", targetEmail)
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).send({ error: "Target user not found" });
        }

        const targetUserDoc = userSnapshot.docs[0];
        const targetUserId = targetUserDoc.id;

        // Check if a pending request already exists
        const existingReqSnapshot = await db.collection("Users")
            .doc(targetUserId)
            .collection("LinkRequests")
            .where("fromUserId", "==", uid)
            .where("status", "==", "pending")
            .limit(1)
            .get();

        if (!existingReqSnapshot.empty) {
            return res.status(409).send({ error: "A pending link request already exists" });
        }

        // Get the SLP's display name from SLPUsers collection
        const slpDoc = await db.collection("SLPUsers").doc(uid).get();
        const slpData = slpDoc.data();
        const slpDisplayName = slpData && slpData.displayName ? slpData.displayName : "";

        // Add a link request to the target user's LinkRequests subcollection
        await db.collection("Users")
            .doc(targetUserId)
            .collection("LinkRequests")
            .add({
                fromUserId: uid,
                fromDisplayName: slpDisplayName,
                requestedAt: new Date(),
                status: "pending"
            });

        res.send({ success: true, message: "Link request sent" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * Get all linked users for an SLP user from the LinkedUsers subcollection.
 */
exports.getLinkedUsers = async (req, res) => {
    const { uid } = req.params; // SLP user's UID

    try {
        const linkedUsersSnapshot = await db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers")
            .get();

        const linkedUsers = [];

        // For each linked user, fetch their data from the Users collection
        const userPromises = linkedUsersSnapshot.docs.map(async doc => {
            const linkedUserId = doc.data().userId;
            const userDoc = await db.collection("Users").doc(linkedUserId).get();
            return {
                id: doc.id,
                ...doc.data(),
                userData: userDoc.exists ? userDoc.data() : null
            };
        });

        const populatedLinkedUsers = await Promise.all(userPromises);

        res.send({
            userId: uid,
            linkedUsers: populatedLinkedUsers
        });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
