const Item = require("../models/Item");

// ── Create Item ───────────────────────────────────────────────────────────────
exports.createItem = async (req, res) => {
  try {
    const { title, description, category, exchangeFor } = req.body;

    if (!title || !category || !exchangeFor) {
      return res.status(400).json({ message: "Title, category, and exchange details are required." });
    }

    const item = new Item({
      title:       title.trim(),
      description: description?.trim() || "",
      category:    category.trim(),
      exchangeFor: exchangeFor.trim(),
      owner:       req.user.id
    });

    await item.save();
    await item.populate("owner", "name suburb");
    res.status(201).json(item);

  } catch (error) {
    console.error("Create item error:", error.message);
    res.status(500).json({ message: "Server error. Could not create listing." });
  }
};

// ── Get All Available Items (Public) ─────────────────────────────────────────
exports.getItems = async (req, res) => {
  try {
    const items = await Item.find({ status: { $ne: "traded" } })
      .populate("owner", "name suburb")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error("Get items error:", error.message);
    res.status(500).json({ message: "Server error. Could not fetch listings." });
  }
};

// ── Get Single Item by ID (Public) ────────────────────────────────────────────
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name suburb");
    if (!item) {
      return res.status(404).json({ message: "Listing not found." });
    }
    res.json(item);
  } catch (error) {
    console.error("Get item by id error:", error.message);
    // Handle invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid listing ID." });
    }
    res.status(500).json({ message: "Server error." });
  }
};

// ── Get Items Belonging to the Logged-in User (Private) ──────────────────────
exports.getUserItems = async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error("Get user items error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Edit Item (Owner Only) ────────────────────────────────────────────────────
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Listing not found." });
    }
    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this listing." });
    }

    const { title, description, category, exchangeFor } = req.body;
    if (!title || !category || !exchangeFor) {
      return res.status(400).json({ message: "Title, category, and exchange details are required." });
    }

    item.title       = title.trim();
    item.description = description?.trim() || "";
    item.category    = category.trim();
    item.exchangeFor = exchangeFor.trim();

    await item.save();
    await item.populate("owner", "name suburb");
    res.json(item);

  } catch (error) {
    console.error("Update item error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Mark Item as Traded (Owner Only) ─────────────────────────────────────────
exports.updateItemStatus = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Listing not found." });
    }
    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this listing." });
    }

    const { status } = req.body;
    const allowed = ["available", "pending", "traded"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    item.status = status;
    await item.save();
    res.json({ message: `Listing marked as ${status}.`, item });

  } catch (error) {
    console.error("Update status error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ── Delete Item (Owner Only) ──────────────────────────────────────────────────
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found." });
    }
    if (item.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this listing." });
    }

    await item.deleteOne();
    res.json({ message: "Listing deleted successfully." });

  } catch (error) {
    console.error("Delete item error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};
