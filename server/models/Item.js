const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true
    },
    exchangeFor: {
      type: String,
      required: [true, "Exchange preference is required"],
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // Tracks the lifecycle of a listing
    status: {
      type: String,
      enum: ["available", "pending", "traded"],
      default: "available"
    }
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model("Item", ItemSchema);
