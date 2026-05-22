const Item = require("../models/Item");

exports.createItem = async (req, res) => {
    try {
        const { title, description, category, exchangeFor } = req.body;

        const item = new Item({
            title,
            description,
            category,
            exchangeFor,
            owner: req.user.id
        });

        await item.save();

        res.status(201).json(item);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getItems = async (req, res) => {
    try {
        const items = await Item.find().populate("owner", "name suburb");
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};