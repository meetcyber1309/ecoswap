const express = require("express");
const router = express.Router();
const itemController = require("../controllers/itemController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create",            authMiddleware, itemController.createItem);       // protected
router.get("/all",                               itemController.getItems);          // public
router.get("/my",                 authMiddleware, itemController.getUserItems);     // protected
router.get("/:id",                               itemController.getItemById);       // public — single item
router.put("/:id",                authMiddleware, itemController.updateItem);       // protected — edit listing
router.patch("/:id/status",       authMiddleware, itemController.updateItemStatus); // protected — mark traded
router.delete("/:id",             authMiddleware, itemController.deleteItem);       // protected — owner only

module.exports = router;
