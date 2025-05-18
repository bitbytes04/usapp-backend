const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");

router.post("/create", controller.createUser);
router.get("/:uid", controller.getUser);
router.get("/:uid/activity-logs", controller.getActivityLogs);
router.get("/:uid/userboards", controller.getAllUserBoards);
router.get("/:uid/:boardId/getboard", controller.getUserBoardById);
router.post("/:uid/edituser", controller.editUser);
router.post("/:uid/:boardId/editboard", controller.editUserBoard);
router.post("/:uid/addbutton", controller.addUserButton);
router.delete("/:uid/:boardId/deletebutton", controller.deleteUserButton);
router.delete("/:uid/:boardId/deleteboard", controller.deleteUserBoard);
router.post("/:uid/boards", controller.addUserBoard);


module.exports = router;
