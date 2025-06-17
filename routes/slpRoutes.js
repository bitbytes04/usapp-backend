const express = require("express");
const router = express.Router();
const controller = require("../controllers/slpController");


router.get("/screen-time-summary/:uid", controller.getScreenTimeSummary);
router.get("/board-usage-summary/:uid/", controller.getBoardUsageSummary);


module.exports = router;
