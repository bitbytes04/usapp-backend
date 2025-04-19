const { db } = require("../firebase/config");

exports.addDefaultButton = async (req, res) => {
    const { buttonName, buttonImagePath, buttonCategory } = req.body;

    try {
        const ref = await db.collection("DefaultButtons").add({
            buttonName,
            buttonImagePath,
            buttonCategory,
        });

        res.status(201).send({ message: "Default button added", id: ref.id });
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
