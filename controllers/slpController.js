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
            .orderBy("timestamp", "desc")
            .get();

        // For each board log, fetch its ButtonPresses subcollection
        const boardLogs = await Promise.all(
            logsSnapshot.docs.map(async doc => {
                const buttonPressesSnapshot = await db
                    .collection("BoardLogs")
                    .doc(doc.id)
                    .collection("ButtonPresses")
                    .get();

                const buttonPresses = buttonPressesSnapshot.docs.map(bpDoc => ({
                    id: bpDoc.id,
                    ...bpDoc.data()
                }));

                return {
                    id: doc.id,
                    ...doc.data(),
                    buttonPresses
                };
            })
        );

        res.send({
            userId: uid,
            boardLogs
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
    const { uid } = req.params; // The SLP user sending the request
    const { targetEmail } = req.body; // The email of the user to link to

    if (!targetEmail) {
        return res.status(400).send({ error: "targetEmail is required" });
    }

    try {
        // Use Firebase Auth to get the target user's UID by email
        let targetUserRecord;
        try {
            targetUserRecord = await auth.getUserByEmail(targetEmail);
        } catch (err) {
            return res.status(404).send({ error: "Target user not found" });
        }
        const targetUserId = targetUserRecord.uid;

        // Check if targetUserId is already in SLP's LinkedUsers
        const linkedUsersSnapshot = await db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers")
            .where("userId", "==", targetUserId)
            .limit(1)
            .get();

        if (!linkedUsersSnapshot.empty) {
            return res.status(409).send({ error: "User is already linked" });
        }

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
        const slpClinicName = slpData && slpData.clinicName ? slpData.clinicName : "";

        // Add a link request to the target user's LinkRequests subcollection
        await db.collection("Users")
            .doc(targetUserId)
            .collection("LinkRequests")
            .add({
                fromUserId: uid,
                fromDisplayName: slpDisplayName,
                fromClinicName: slpClinicName,
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

/**
 * Remove a linked user from an SLP user's LinkedUsers subcollection.
 */
exports.removeLinkedUser = async (req, res) => {
    const { uid, linkedUserId } = req.params; // SLP user's UID and linked user's UID

    if (!linkedUserId) {
        return res.status(400).send({ error: "linkedUserId is required" });
    }

    try {
        // Remove from SLPUsers/{uid}/LinkedUsers
        const linkedUsersRef = db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers");
        const snapshot = await linkedUsersRef
            .where("userId", "==", linkedUserId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).send({ error: "Linked user not found" });
        }

        await linkedUsersRef.doc(snapshot.docs[0].id).delete();

        // Remove from Users/{linkedUserId}/LinkRequests where fromUserId == uid
        const linkRequestsRef = db
            .collection("Users")
            .doc(linkedUserId)
            .collection("LinkRequests");
        const linkReqSnapshot = await linkRequestsRef
            .where("fromUserId", "==", uid)
            .get();

        const deletePromises = linkReqSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        res.send({ success: true, message: "Linked user and related link requests removed" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * Edit an SLP user's profile information.
 */
exports.editSLPUser = async (req, res) => {
    const { uid } = req.params;
    const { displayName, clinicName } = req.body;

    if (!uid) {
        return res.status(400).send({ error: "uid is required" });
    }

    try {
        const slpUserRef = db.collection("SLPUsers").doc(uid);

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (clinicName !== undefined) updateData.clinicName = clinicName;


        if (Object.keys(updateData).length === 0) {
            return res.status(400).send({ error: "No fields to update" });
        }

        await slpUserRef.update(updateData);

        res.send({ success: true, message: "SLP user updated", updatedFields: updateData });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};


exports.getSLPUser = async (req, res) => {
    const { uid } = req.params;

    if (!uid) {
        return res.status(400).send({ error: "uid is required" });
    }

    try {
        const slpUserDoc = await db.collection("SLPUsers").doc(uid).get();

        if (!slpUserDoc.exists) {
            return res.status(404).send({ error: "SLP user not found" });
        }

        res.send({ userId: uid, ...slpUserDoc.data() });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};


exports.postRemark = async (req, res) => {
    const { uid, targetUserId } = req.params; // SLP UID and target user UID
    const { remark, title } = req.body;

    if (!remark) {
        return res.status(400).send({ error: "remark is required" });
    }
    if (!title) {
        return res.status(400).send({ error: "title is required" });
    }

    try {
        await db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers")
            .doc(targetUserId)
            .collection("Remarks")
            .add({
                slpUserId: uid,
                remark,
                title,
                createdAt: new Date().toISOString()
            });

        res.send({ success: true, message: "Remark posted" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};


exports.getRemarks = async (req, res) => {
    const { uid, targetUserId } = req.params;

    try {
        const remarksSnapshot = await db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers")
            .doc(targetUserId)
            .collection("Remarks")
            .orderBy("createdAt", "desc")
            .get();

        const remarks = remarksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.send({ userId: targetUserId, remarks });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};


exports.deleteRemark = async (req, res) => {
    const { uid, targetUserId, remarkId } = req.params;

    if (!remarkId) {
        return res.status(400).send({ error: "remarkId is required" });
    }

    try {
        const remarkRef = db
            .collection("SLPUsers")
            .doc(uid)
            .collection("LinkedUsers")
            .doc(targetUserId)
            .collection("Remarks")
            .doc(remarkId);

        const remarkDoc = await remarkRef.get();

        if (!remarkDoc.exists || remarkDoc.data().slpUserId !== uid) {
            return res.status(404).send({ error: "Remark not found or not authorized" });
        }

        await remarkRef.delete();

        res.send({ success: true, message: "Remark deleted" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};