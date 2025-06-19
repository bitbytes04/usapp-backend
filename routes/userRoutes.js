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
router.post("/:uid/:boardId/deletebutton", controller.deleteUserButton);
router.post("/:uid/:boardId/deleteboard", controller.deleteUserBoard);
router.post("/:uid/boards", controller.addUserBoard);
router.get("/:uid/userbuttons", controller.getUserButtons);
router.post("/:uid/log-screen-time", controller.logScreenTime);
router.post("/:uid/:boardId/log-board-usage", controller.logBoardUsage);
router.post("/:uid/feedback", controller.postUserFeedback);
router.get("/:uid/linkrequests", controller.getAllLinkRequests);
router.post("/:uid/linkrequests/:requestId/approve/:slpId", controller.approveLinkRequest);

module.exports = router;
