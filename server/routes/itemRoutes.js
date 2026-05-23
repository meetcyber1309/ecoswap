const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, itemController.createItem);       // protected
router.get("/all", itemController.getItems);                             // public
router.get("/my", authMiddleware, itemController.getUserItems);          // protected — current user's listings
router.delete("/:id", authMiddleware, itemController.deleteItem);        // protected — owner only

module.exports = router;
