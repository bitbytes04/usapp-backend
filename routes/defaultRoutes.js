const express = require("express");
const router = express.Router();
const controller = require("../controllers/defaultController");

router.post("/buttons", controller.addDefaultButton);
router.post("/boards", controller.createDefaultBoard);
router.post("/boards/:boardId/buttons", controller.addButtonToDefaultBoard);

module.exports = router;
