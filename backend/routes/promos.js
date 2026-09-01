const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadFolder = path.join(__dirname, "..", "assets", "promos");
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

// Get all home promos
router.get("/", (req, res) => {
    const sql = "SELECT * FROM home_promos ORDER BY id ASC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ DB FETCH error:", err);
            return res.status(500).json({ message: "Database fetch error" });
        }
        res.json(results);
    });
});

// Create a new promo slot
router.post("/", upload.single("image"), (req, res) => {
    const { title, subtitle, offer_text, link_url, status } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "Please provide an image" });
    }

    const imagePath = `/assets/promos/${file.filename}`;

    const sql = "INSERT INTO home_promos (title, subtitle, offer_text, image_url, link_url, status) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(sql, [title, subtitle, offer_text, imagePath, link_url, status || 'active'], (err, result) => {
        if (err) {
            console.error("❌ DB INSERT error:", err);
            return res.status(500).json({ message: "Database insert error" });
        }
        res.status(201).json({ message: "✅ Promo added successfully!", id: result.insertId, image_url: imagePath });
    });
});

// Update a promo slot
router.put("/:id", upload.single("image"), (req, res) => {
    const { id } = req.params;
    const { title, subtitle, offer_text, link_url, status } = req.body;
    const file = req.file;

    // Fetch current promo to check for existing image
    const getSql = "SELECT image_url FROM home_promos WHERE id = ?";
    db.query(getSql, [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ message: "Promo not found" });
        }

        let imagePath = rows[0].image_url;

        if (file) {
            // Delete old image if it's not the placeholder
            if (imagePath && !imagePath.includes("placeholder.png")) {
                const oldImagePath = path.join(__dirname, "..", imagePath);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.warn("⚠️ Failed to delete old image:", oldImagePath);
                    });
                }
            }
            imagePath = `/assets/promos/${file.filename}`;
        }

        const updateSql = `
      UPDATE home_promos 
      SET title = ?, subtitle = ?, offer_text = ?, image_url = ?, link_url = ?, status = ?
      WHERE id = ?
    `;

        db.query(updateSql, [title, subtitle, offer_text, imagePath, link_url, status || 'active', id], (err, result) => {
            if (err) {
                console.error("❌ DB UPDATE error:", err);
                return res.status(500).json({ message: "Database update error" });
            }
            res.json({ message: "✅ Promo updated successfully!", image_url: imagePath });
        });
    });
});

// Delete a promo slot
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    // First get the image path to delete the file
    const getSql = "SELECT image_url FROM home_promos WHERE id = ?";
    db.query(getSql, [id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ message: "Promo not found" });
        }

        const imagePath = rows[0].image_url;

        // Delete from DB
        const deleteSql = "DELETE FROM home_promos WHERE id = ?";
        db.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error("❌ DB DELETE error:", err);
                return res.status(500).json({ message: "Database delete error" });
            }

            // Delete image file if it's not the placeholder
            if (imagePath && !imagePath.includes("placeholder.png")) {
                const fullPath = path.join(__dirname, "..", imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlink(fullPath, (err) => {
                        if (err) console.warn("⚠️ Failed to delete image file:", fullPath);
                    });
                }
            }

            res.json({ message: "✅ Promo deleted successfully!" });
        });
    });
});

module.exports = router;
