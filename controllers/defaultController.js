const { db } = require("../firebase/config");

exports.addDefaultButton = async (req, res) => {
    const buttons = req.body.buttons; // Expecting an array of button objects

    // if (!Array.isArray(buttons)) {
    //     return res.status(400).send({ error: "Invalid input, expected an array of buttons" });
    // }

    try {
        const addedButtons = [];
        for (const button of buttons) {
            const { buttonName, buttonImagePath, buttonCategory } = button;

            const ref = await db.collection("DefaultButtons").add({
                buttonName,
                buttonImagePath,
                buttonCategory,
            });

            addedButtons.push({ id: ref.id, buttonName });
        }

        res.status(201).send({ message: "Default buttons added", addedButtons });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.createDefaultBoard = async (req, res) => {
    try {
        const ref = await db.collection("DefaultBoards").add({});
        res.status(201).send({ message: "Default board created", id: ref.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

exports.addButtonToDefaultBoard = async (req, res) => {
    const { buttonType, buttonId } = req.body;

    try {
        const ref = db.collection("DefaultBoards")
            .doc(req.params.boardId)
            .collection("BoardButtonList");

        const added = await ref.add({ buttonType, buttonId });
        res.status(201).send({ message: "Button added to default board", id: added.id });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
