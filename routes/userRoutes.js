const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

router.post("/create", controller.createUser);
router.get("/:uid", controller.getUser);
router.get("/:uid/activity-logs", controller.getActivityLogs);
router.get("/:uid/userboards", controller.getAllUserBoards);
router.post("/:uid/edituser", controller.editUser);


router.post("/:uid/buttons", controller.addUserButton);
router.post("/:uid/boards", controller.addUserBoard);



module.exports = router;
