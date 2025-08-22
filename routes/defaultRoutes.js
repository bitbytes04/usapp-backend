const express = require("express");
const router = express.Router();
const controller = require("../controllers/defaultController");

router.post("/buttons", controller.addDefaultButton);
router.post("/boards", controller.createDefaultBoard);
router.post("/boards/:boardId/buttons", controller.addButtonToDefaultBoard);
router.get("/buttons/:buttonId", controller.getButton);
router.get("/buttonsall", controller.getAllButtons)
router.post("/button", controller.addSingleDefaultButton);
router.delete("/buttons/:buttonId", controller.deleteDefaultButton);
router.post("/buttons/:buttonId", controller.editDefaultButton);

module.exports = router;
