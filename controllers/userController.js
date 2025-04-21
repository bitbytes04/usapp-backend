const { sendPasswordResetEmail } = require("firebase/auth/web-extension");
const { db, auth } = require("../firebase/config");
const logActivity = require("../utils/logActivity");

exports.createUser = async (req, res) => {
    const { uid, firstName, lastName, username, email, userType, age } = req.body;



    try {
        const userData = {
            firstName,
            lastName,
            username,
            email,
            userType,
            age,
        };

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
    const { boardName, isFavorite } = req.body;

    try {
        const ref = await db.collection("Users").doc(req.params.uid).collection("UserBoards").add({
            boardName,
            isFavorite,
        });

        await logActivity(req.params.uid, "Created user board", boardName);
        res.status(201).send({ message: "User board added", boardId: ref.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.addButtonToUserBoard = async (req, res) => {
    const { buttonType, buttonId } = req.body;

    try {
        const ref = db.collection("Users")
            .doc(req.params.uid)
            .collection("UserBoards")
            .doc(req.params.boardId)
            .collection("BoardButtonList");

        const added = await ref.add({ buttonType, buttonId });

        await logActivity(req.params.uid, "Added button to board", `Board ID: ${req.params.boardId}`);
        res.status(201).send({ message: "Button added to board", id: added.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

