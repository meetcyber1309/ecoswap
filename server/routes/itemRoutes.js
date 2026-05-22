const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, itemController.createItem);
router.get("/all", itemController.getItems);

module.exports = router;