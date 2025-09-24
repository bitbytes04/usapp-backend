const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");


// Activity Logs
router.get("/activity-logs", controller.getActivityLogs);
router.get("/activity-logs/:id", controller.getActivityLogById);
router.get("/board-logs", controller.getAllBoardLogs);

// Speech Pathologist
router.post("/slp", controller.createSpeechPathologist);
router.get("/slp-users", controller.getAllSLPUsers);
router.get("/users", controller.getAllUsers);
router.post("/login", controller.adminLogin);

// User Feedback Summary
router.post("/summarize-feedback", controller.summarizeUserFeedback);
router.get("/user-feedbacks", controller.getAllUserFeedbacks);

//disable user
router.post("/disable-user/:uid", controller.disableUser);

// Enable user
router.post("/enable-user/:uid", controller.enableUser);


// Generate Written Report
router.post("/generate-written-report", controller.generateWrittenReport);

module.exports = router;