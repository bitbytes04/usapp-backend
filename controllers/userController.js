
const { db, auth, storage } = require("../firebase/config");
const { logActivity, logBoardActivity } = require("../utils/logActivity");


exports.createUser = async (req, res) => {
    const { uid, firstName, lastName, username, email, userType, age, endName, endAge } = req.body;

    try {
        const userData = {
            firstName,
            lastName,
            username,
            email,
            userType,
            age,
            boardPreference: "right", // default value
            preferredVoice: 0, // default value
            preferredPitch: 1,
            preferredSpeed: 1,
            emotionToggle: "off" // default value
        };

        // Add endName and endAge if userType is "Guardian"
        if (userType === "Guardian") {
            userData.endName = endName;
            userData.endAge = endAge;
        }

        await db.collection("Users").doc(uid).set(userData);

        await logActivity(uid, "Completed profile");
        res.status(201).send({ message: "User profile created" });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const doc = await db.collection("Users").doc(req.params.uid).get();
        if (!doc.exists) return res.status(404).send({ message: "User not found" });
        res.send(doc.data());
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const snapshot = await db.collection("ActivityLogs")
            .where("userId", "==", req.params.uid)
            .orderBy("timestamp", "desc")
            .get();

        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.send(logs);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.addUserButton = async (req, res) => {
    const { buttonName, buttonImagePath, buttonCategory } = req.body;

    try {
        const ref = await db.collection("Users").doc(req.params.uid).collection("UserButtons").add({
            buttonName,
            buttonImagePath,
            buttonCategory,
        });

        await logActivity(req.params.uid, "Added user button", buttonName);
        res.status(201).send({ message: "User button added", id: ref.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.addUserBoard = async (req, res) => {
    const { boardName, isFavorite, buttonIds, boardCategory } = req.body;

    try {
        // Validate button IDs by checking if they exist in DefaultButtons or UserButtons
        const buttonRefs = await Promise.all(
            buttonIds.map(async (buttonId) => {
                // Check DefaultButtons
                let buttonDoc = await db.collection("DefaultButtons").doc(buttonId).get();
                if (buttonDoc.exists) return buttonId;
                // Check UserButtons
                buttonDoc = await db
                    .collection("Users")
                    .doc(req.params.uid)
                    .collection("UserButtons")
                    .doc(buttonId)
                    .get();
                if (buttonDoc.exists) return buttonId;
                throw new Error(`Button with ID ${buttonId} does not exist`);
            })
        );

        // Get button names for logging
        const buttonNames = await Promise.all(
            buttonRefs.map(async (buttonId) => {
                let buttonDoc = await db.collection("DefaultButtons").doc(buttonId).get();
                if (buttonDoc.exists) return buttonDoc.data().buttonName;
                buttonDoc = await db
                    .collection("Users")
                    .doc(req.params.uid)
                    .collection("UserButtons")
                    .doc(buttonId)
                    .get();
                if (buttonDoc.exists) return buttonDoc.data().buttonName;
                return null;
            })
        );

        // Create the user board
        const ref = await db.collection("Users").doc(req.params.uid).collection("UserBoards").add({
            boardName,
            isFavorite,
            buttonIds: buttonRefs,
            boardCategory: boardCategory // Store the validated button IDs
        });

        await logActivity(req.params.uid, "Created user board", boardName);
        await logBoardActivity(req.params.uid, boardName, buttonNames.filter(Boolean));
        res.status(201).send({ message: "User board added", boardId: ref.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

// New function: Get all user boards
exports.getAllUserBoards = async (req, res) => {
    try {
        const snapshot = await db.collection("Users").doc(req.params.uid).collection("UserBoards").get();

        const boards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.send(boards);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.postUserFeedback = async (req, res) => {
    const { uid, message } = req.body;

    if (!uid || !message) {
        return res.status(400).send({ error: "uid and message are required" });
    }

    try {
        await db.collection("UserFeedback").add({
            uid,
            message,
            timestamp: new Date().toISOString(),
        });


        res.status(201).send({ message: "User feedback posted" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.getUserBoardById = async (req, res) => {
    try {
        const boardDoc = await db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserBoards")
            .doc(req.params.boardId)
            .get();

        if (!boardDoc.exists) {
            return res.status(404).send({ message: "User board not found" });
        }

        const boardData = boardDoc.data();
        const buttonIds = boardData.buttonIds || [];

        // Fetch button data for each buttonId from DefaultButtons and UserButtons
        const buttonPromises = buttonIds.map(async (buttonId) => {
            // Try DefaultButtons first
            let buttonDoc = await db.collection("DefaultButtons").doc(buttonId).get();
            if (buttonDoc.exists) {
                return { id: buttonDoc.id, ...buttonDoc.data(), source: "DefaultButtons" };
            }
            // If not found, try UserButtons
            buttonDoc = await db
                .collection("Users")
                .doc(req.params.uid)
                .collection("UserButtons")
                .doc(buttonId)
                .get();
            if (buttonDoc.exists) {
                return { id: buttonDoc.id, ...buttonDoc.data(), source: "UserButtons" };
            }
            return null;
        });

        const buttons = (await Promise.all(buttonPromises)).filter(Boolean);

        res.send({ id: boardDoc.id, ...boardData, buttons });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.deleteUserBoard = async (req, res) => {
    try {
        const { uid, boardId } = req.params;
        if (!uid || !boardId) {
            return res.status(400).send({ error: "Missing uid or boardId parameter" });
        }

        const boardRef = db
            .collection("Users")
            .doc(uid)
            .collection("UserBoards")
            .doc(boardId);

        const boardDoc = await boardRef.get();
        if (!boardDoc.exists) {
            return res.status(404).send({ message: "User board not found" });
        }

        const res = await boardRef.delete();


        await logActivity(uid, "Deleted user board");
        res.status(200).send({ res });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.deleteUserButton = async (req, res) => {
    try {
        const buttonDoc = await db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserButtons")
            .doc(req.params.buttonId)
            .get();

        if (buttonDoc.exists) {
            const buttonData = buttonDoc.data();
            if (buttonData.buttonImagePath) {
                // Extract storage path from download URL
                const url = new URL(buttonData.buttonImagePath);
                const pathMatch = url.pathname.match(/\/o\/(.+?)$/);
                if (pathMatch && pathMatch[1]) {
                    const storagePath = decodeURIComponent(pathMatch[1]);
                    await storage.bucket().file(storagePath).delete().catch(() => { });
                }
            }
        }
    } catch (error) {

    }
    try {
        await db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserButtons")
            .doc(req.params.buttonId)
            .delete();

        await logActivity(req.params.uid, "Deleted user button");
        res.status(200).send({ message: "User button deleted" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
exports.editUser = async (req, res) => {
    const {
        firstName,
        lastName,
        username,
        email,
        userType,
        age,
        endName,
        endAge,
        boardPreference,
        preferredVoice,
        preferredPitch,
        preferredSpeed,
        emotionToggle
    } = req.body;

    try {
        const userData = {
            firstName,
            lastName,
            username,
            email,
            userType,
            age,
            boardPreference,
            preferredVoice,
            preferredPitch,
            preferredSpeed,
            emotionToggle

        };

        if (userType === "Guardian") {
            userData.endName = endName;
            userData.endAge = endAge;
        }

        await db.collection("Users").doc(req.params.uid).update(userData);

        await logActivity(req.params.uid, "Updated profile");
        res.status(200).send({ message: "User profile updated" });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};

exports.editUserBoard = async (req, res) => {
    const { boardName, isFavorite, buttonIds } = req.body;

    try {
        // Validate button IDs by checking if they exist in DefaultButtons or UserButtons
        const validatedButtonIds = await Promise.all(
            buttonIds.map(async (buttonId) => {
                // Check DefaultButtons
                let buttonDoc = await db.collection("DefaultButtons").doc(buttonId).get();
                if (buttonDoc.exists) return buttonId;
                // Check UserButtons
                buttonDoc = await db
                    .collection("Users")
                    .doc(req.params.uid)
                    .collection("UserButtons")
                    .doc(buttonId)
                    .get();
                if (buttonDoc.exists) return buttonId;
                throw new Error(`Button with ID ${buttonId} does not exist`);
            })
        );

        await db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserBoards")
            .doc(req.params.boardId)
            .update({
                boardName,
                isFavorite,
                buttonIds: validatedButtonIds,
            });

        await logActivity(req.params.uid, "Edited user board", boardName);
        res.status(200).send({ message: "User board updated" });
    } catch (err) {
        res.status(400).send({ error: err.message });
    }
};

exports.editUserButton = async (req, res) => {
    const { buttonName, buttonCategory } = req.body;
    const { uid, buttonId } = req.params;

    if (!buttonName || !buttonCategory) {
        return res.status(400).send({ error: "buttonName and buttonCategory are required" });
    }

    try {
        await db
            .collection("Users")
            .doc(uid)
            .collection("UserButtons")
            .doc(buttonId)
            .update({
                buttonName,
                buttonCategory,
            });

        await logActivity(uid, "Edited user button", buttonName);
        res.status(200).send({ message: "User button updated" });
    } catch (err) {
        res.status(400).send({ error: err.message });
    }
};

exports.getUserButtons = async (req, res) => {
    try {
        const userButtonsRef = db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserButtons");

        const snapshot = await userButtonsRef.get();

        // If the collection does not exist or has no documents, return an empty array
        if (snapshot.empty) {
            return res.send([]);
        }
        else {
            const buttons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            res.send(buttons);
        }
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.logScreenTime = async (req, res) => {
    const { uid } = req.params;
    const { duration, activityType, timestamp } = req.body;

    if (!duration || !activityType) {
        return res.status(400).send({ error: "Missing duration or activityType in request body" });
    }

    try {
        await db.collection("ScreenTimeLogs").add({
            userId: uid,
            duration,
            activityType,
            timestamp: timestamp || new Date().toISOString(),
        });

        await logActivity(uid, "Logged screen time", `${activityType}: ${duration}ms`);
        res.status(201).send({ message: "Screen time logged" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.logBoardUsage = async (req, res) => {
    const { uid, boardId } = req.params;
    const { buttonPresses } = req.body; // { buttonId: count, ... }

    if (!uid || !boardId || !buttonPresses || typeof buttonPresses !== "object") {
        return res.status(400).send({ error: "Missing uid, boardId, or buttonPresses in request" });
    }

    try {
        // Create a new board log entry
        const boardLogRef = await db.collection("BoardLogs").add({
            userId: uid,
            boardId,
            timestamp: new Date().toISOString(),
        });

        // Add button press counts as a subcollection
        const buttonPressEntries = Object.entries(buttonPresses);
        await Promise.all(
            buttonPressEntries.map(([buttonId, count]) =>
                boardLogRef.collection("ButtonPresses").doc(buttonId).set({
                    buttonId,
                    count,
                })
            )
        );

        await logActivity(uid, "Logged board usage", `Board: ${boardId}`);
        res.status(201).send({ message: "Board usage logged", logId: boardLogRef.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.submitUserFeedback = async (req, res) => {
    const { uid } = req.params;
    const { feedback, rating } = req.body;

    if (!feedback || typeof feedback !== "string") {
        return res.status(400).send({ error: "Feedback is required and must be a string" });
    }

    try {
        await db.collection("UserFeedbacks").add({
            userId: uid,
            feedback,
            rating: typeof rating === "number" ? rating : null,
            timestamp: new Date().toISOString(),
        });


        res.status(201).send({ message: "Feedback submitted" });
        await logActivity(uid, "Submitted user feedback", feedback);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.getAllLinkRequests = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db
            .collection("Users")
            .doc(uid)
            .collection("LinkRequests")
            .get();

        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.send(requests);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.approveLinkRequest = async (req, res) => {
    const { uid, requestId, slpId } = req.params; // uid: the user receiving the request (the User), requestId: the LinkRequest doc ID

    try {
        // Get the link request document
        const linkRequestRef = db
            .collection("Users")
            .doc(uid)
            .collection("LinkRequests")
            .doc(requestId);

        const linkRequestDoc = await linkRequestRef.get();
        if (!linkRequestDoc.exists) {
            return res.status(404).send({ error: "Link request not found" });
        }

        const linkRequestData = linkRequestDoc.data();
        if (linkRequestData.status === "approved") {
            return res.status(400).send({ error: "Link request already approved" });
        }

        // Mark the request as approved
        await linkRequestRef.update({ status: "approved", approvedAt: new Date() });

        // Add the SLP to the User's LinkedSLPs subcollection
        await db
            .collection("SLPUsers")
            .doc(slpId)
            .collection("LinkedUsers")
            .add({
                linkedAt: new Date(),
                userId: uid // Add the User's uid to the LinkedSLPs collection
            });

        res.send({ success: true, message: "Link request approved and SLP linked" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
