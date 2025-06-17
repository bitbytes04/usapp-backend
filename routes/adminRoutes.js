const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");


// Activity Logs
router.get("/activity-logs", controller.getActivityLogs);
router.get("/activity-logs/:id", controller.getActivityLogById);

// Speech Pathologist
router.post("/slp", controller.createSpeechPathologist);
router.get("/slp-users", controller.getAllSLPUsers);
router.get("/users", controller.getAllUsers);
router.post("/login", controller.adminLogin);
module.exports = router;