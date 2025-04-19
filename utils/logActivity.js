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

module.exports = logActivity;
