const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files from /client
app.use(express.static(path.join(__dirname, "../client")));

// ── MongoDB Atlas Connection ─────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅  MongoDB Atlas connected successfully"))
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1); // Exit if DB is unreachable at startup
  });

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);

// Health-check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Neighbor Trade API is running" });
});

// ── Catch-all: serve frontend for non-API routes (SPA support) ───────────────
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  Server running at http://localhost:${PORT}`);
});
