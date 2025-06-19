const { db } = require("../firebase/config");

const logActivity = async (userId, action, details = "") => {
    try {
        await db.collection("ActivityLogs").add({
            userId,
            action,
            details,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error("Activity Log Error:", error.message);
    }
};

const logBoardActivity = async (userId, boardName, buttonNames = []) => {
    try {
        await db.collection("BoardActivityLogs").add({
            userId,
            boardName,
            buttonNames,
            timestamp: new Date(),
        });
    } catch (error) {
        console.error("Board Activity Log Error:", error.message);
    }
};


module.exports = logActivity, logBoardActivity;
