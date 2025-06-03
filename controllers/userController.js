
const { db, auth, storage } = require("../firebase/config");
const logActivity = require("../utils/logActivity");

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
            preferredPitch: 1, // default value
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
    const { boardName, isFavorite, buttonIds } = req.body;

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

        // Create the user board
        const ref = await db.collection("Users").doc(req.params.uid).collection("UserBoards").add({
            boardName,
            isFavorite,
            buttonIds: buttonRefs, // Store the validated button IDs
        });

        await logActivity(req.params.uid, "Created user board", boardName);
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
        preferredPitch
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

exports.getUserButtons = async (req, res) => {
    try {
        const snapshot = await db
            .collection("Users")
            .doc(req.params.uid)
            .collection("UserButtons")
            .get();

        const buttons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.send(buttons);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};