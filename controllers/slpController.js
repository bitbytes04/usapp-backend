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
