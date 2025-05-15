const { sendPasswordResetEmail } = require("firebase/auth/web-extension");
const { db, auth } = require("../firebase/config");
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
        // Validate button IDs by checking if they exist in the DefaultButtons collection
        const buttonRefs = await Promise.all(
            buttonIds.map(async (buttonId) => {
                const buttonDoc = await db.collection("DefaultButtons").doc(buttonId).get();
                if (!buttonDoc.exists) {
                    throw new Error(`Button with ID ${buttonId} does not exist`);
                }
                return buttonId;
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

// New function: Edit user
exports.editUser = async (req, res) => {
    const { firstName, lastName, username, email, userType, age, endName, endAge } = req.body;

    try {
        const userData = {
            firstName,
            lastName,
            username,
            email,
            userType,
            age,
        };

        // Add endName and endAge if userType is "Guardian"
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

        res.send({ id: boardDoc.id, ...boardDoc.data() });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};