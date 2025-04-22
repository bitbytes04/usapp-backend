const express = require("express");
const router = express.Router();
const controller = require("../controllers/boardController");

router.post("/selected", controller.activateTextToSpeech);
router.post("/buildsentence", controller.buildSentence);

module.exports = router;