const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

router.post("/create", controller.createUser);
router.get("/:uid", controller.getUser);
router.get("/:uid/activity-logs", controller.getActivityLogs);

router.post("/:uid/buttons", controller.addUserButton);
router.post("/:uid/boards", controller.addUserBoard);
router.post("/:uid/boards/:boardId/buttons", controller.addButtonToUserBoard);

module.exports = router;
