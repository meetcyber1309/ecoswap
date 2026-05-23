const Item = require("../models/Item");

// ── Create Item ───────────────────────────────────────────────────────────────
exports.createItem = async (req, res) => {
  try {
    const { title, description, category, exchangeFor } = req.body;

    // Server-side validation
    if (!title || !category || !exchangeFor) {
      return res.status(400).json({ message: "Title, category, and exchange details are required." });
    }

    const item = new Item({
      title: title.trim(),
      description: description?.trim() || "",
      category: category.trim(),
      exchangeFor: exchangeFor.trim(),
      owner: req.user.id
    });

    await item.save();
    // Populate owner so the response matches the GET /all format
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
      .sort({ createdAt: -1 }); // newest first
    res.json(items);
  } catch (error) {
    console.error("Get items error:", error.message);
    res.status(500).json({ message: "Server error. Could not fetch listings." });
  }
};

// ── Get Items Belonging to the Logged-in User (Private) ──────────────────────
exports.getUserItems = async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user.id })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error("Get user items error:", error.message);
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

    // Ownership check — only the creator can delete their listing
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
