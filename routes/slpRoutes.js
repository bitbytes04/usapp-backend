const express = require("express");
const router = express.Router();
const controller = require("../controllers/slpController");


router.get("/screen-time-summary/:uid", controller.getScreenTimeSummary);
router.get("/board-usage-summary/:uid/", controller.getBoardUsageSummary);
router.get("/:uid/linked-users", controller.getLinkedUsers);
router.post("/link-request/:uid", controller.postLinkRequest);
router.post("/remove-link/:uid/:linkedUserId", controller.removeLinkedUser);
router.post("/edit-slp/:uid", controller.editSLPUser);
router.get("/get-slp/:uid", controller.getSLPUser);
router.post("/:uid/linked-users/:targetUserId/remark", controller.postRemark);
router.get("/:uid/linked-users/:targetUserId/remarks", controller.getRemarks);
router.delete("/:uid/linked-users/:targetUserId/remarks/:remarkId", controller.deleteRemark);
module.exports = router;
