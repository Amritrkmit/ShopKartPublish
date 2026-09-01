const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");



console.log("✅ slider.js loaded");

// Ensure upload directory exists
const uploadFolder = path.join(__dirname, "..", "assets", "slider");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  },
});

const upload = multer({ storage });

// Upload slider
router.post("/", upload.single("image"), (req, res) => {
  const { title } = req.body;
  const file = req.file;

  if (!title || !file) {
    return res.status(400).json({ message: "Please provide title and image" });
  }

  const imagePath = `/assets/slider/${file.filename}`;

  const sql = "INSERT INTO sliders (title, image) VALUES (?, ?)";
  db.query(sql, [title, imagePath], (err, result) => {
    if (err) {
      console.error("❌ DB INSERT error:", err);
      return res.status(500).json({ message: "Database insert error" });
    }
    res.status(201).json({ message: "✅ Slider added successfully!", imagePath });
  });
});

// Get all sliders
router.get("/", (req, res) => {
  const sql = "SELECT * FROM sliders ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ DB FETCH error:", err);
      return res.status(500).json({ message: "Database fetch error" });
    }
    res.json(results);
  });
});

// Update slider
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const file = req.file;

  if (!title) {
    return res.status(400).json({ message: "Please provide title" });
  }

  // If new image is uploaded, delete old one
  if (file) {
    const getSql = "SELECT image FROM sliders WHERE id = ?";
    db.query(getSql, [id], (err, rows) => {
      if (!err && rows.length > 0) {
        const oldImagePath = path.join(__dirname, "..", rows[0].image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.warn("⚠️ Failed to delete old image:", oldImagePath);
        });
      }
    });

    const newImagePath = `/assets/slider/${file.filename}`;
    const updateSql = "UPDATE sliders SET title = ?, image = ? WHERE id = ?";
    db.query(updateSql, [title, newImagePath, id], (err, result) => {
      if (err) {
        console.error("❌ DB UPDATE error:", err);
        return res.status(500).json({ message: "Database update error" });
      }
      res.json({ message: "✅ Slider updated successfully!", imagePath: newImagePath });
    });
  } else {
    // Update only title
    const updateSql = "UPDATE sliders SET title = ? WHERE id = ?";
    db.query(updateSql, [title, id], (err, result) => {
      if (err) {
        console.error("❌ DB UPDATE error:", err);
        return res.status(500).json({ message: "Database update error" });
      }
      res.json({ message: "✅ Slider updated successfully!" });
    });
  }
});

// Delete slider
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // First get the image path
  const getSql = "SELECT image FROM sliders WHERE id = ?";
  db.query(getSql, [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(500).json({ message: "Slider not found or error" });
    }

    const imagePath = path.join(__dirname, "..", rows[0].image);

    // Delete from DB
    const deleteSql = "DELETE FROM sliders WHERE id = ?";
    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Failed to delete slider" });
      }

      // Delete image file
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.warn("⚠️ Failed to delete image file:", imagePath);
        }
        res.json({ message: "✅ Slider deleted successfully!" });
      });
    });
  });
});

module.exports = router;
