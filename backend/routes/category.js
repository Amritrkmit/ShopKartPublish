const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAdmin = require("../middlewares/requireAdmin");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ulid } = require('ulid');
const crypto = require('crypto');
const { CategoryDTO } = require('../dtos'); // Import DTO for data cleaning

// Ensure upload folder exists
const uploadFolder = path.join(__dirname, "..", "assets", "categories");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

console.log("✅ category.js loaded");

/**
 * POST /api/categories
 * Add a new category
 */
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  const { name, slug, description, parentId, active, meta_title, meta_description, meta_keywords } = req.body;
  const file = req.file;

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const imagePath = file ? `/assets/categories/${file.filename}` : null;
  const uid = `CAT-${ulid()}`;
  const url_token = crypto.randomBytes(64).toString('hex');

  const sql =
    "INSERT INTO categories (uid, url_token, name, slug, description, parent_id, active, image, meta_title, meta_description, meta_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [uid, url_token, name, slug, description, parentId || null, active === "true" ? 1 : 0, imagePath, meta_title || null, meta_description || null, meta_keywords || null],
    async (err, result) => {
      if (err) {
        console.error("❌ DB INSERT error:", err);
        return res.status(500).json({ message: "Database insert error", error: err.sqlMessage || err.message });
      }

      const categoryId = result.insertId;

      // Handle Brand Mappings
      let brandIds = req.body.brandIds;
      if (brandIds) {
        if (typeof brandIds === 'string') brandIds = brandIds.split(',');
        try {
          const promiseDb = db.promise;
          const values = brandIds.map(bid => [parseInt(bid), categoryId, null]);
          await promiseDb.query('INSERT IGNORE INTO brand_mappings (brand_id, category_id, subcategory_id) VALUES ?', [values]);
        } catch (mErr) {
          console.error("❌ Error mapping brands to category:", mErr);
        }
      }

      res.status(201).json({ message: "✅ Category added successfully!" });
    }
  );
});

/**
 * GET /api/categories
 * Fetch all categories (cleaned - no sensitive fields)
 */
router.get("/", (req, res) => {
  const sql = "SELECT * FROM categories ORDER BY id DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ DB FETCH error:", err);
      return res.status(500).json({ message: "Database fetch error" });
    }

    // Clean the data before sending to frontend
    const cleanedCategories = CategoryDTO.toList(results);
    res.json(cleanedCategories);
  });
});

/**
 * PUT /api/categories/:id
 * Update category
 */
// Update category
router.put("/:id", requireAdmin, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, slug, description, parentId, active, meta_title, meta_description, meta_keywords } = req.body;
  const file = req.file;

  // Fix: Handle 'null' string from FormData
  const validParentId = (parentId === "null" || parentId === "undefined" || !parentId) ? null : parentId;
  const isActive = active === "true" || active === "1" || active === 1;

  let sql = "UPDATE categories SET name=?, slug=?, description=?, parent_id=?, active=?, meta_title=?, meta_description=?, meta_keywords=?";
  const params = [name, slug, description, validParentId, isActive ? 1 : 0, meta_title || null, meta_description || null, meta_keywords || null];

  if (file) {
    sql += ", image=?";
    params.push(`/assets/categories/${file.filename}`);
  }

  sql += " WHERE id=?";
  params.push(id);

  db.query(sql, params, async (err, result) => {
    if (err) {
      console.error("❌ DB UPDATE error:", err);
      return res.status(500).json({ message: "Database update error", error: err.sqlMessage || err.message });
    }

    // Handle Brand Mappings (Sync)
    let brandIds = req.body.brandIds;
    if (brandIds !== undefined) { // If it's provided in body (can be empty string for none)
      try {
        const promiseDb = db.promise;
        // 1. Delete old mappings
        await promiseDb.query('DELETE FROM brand_mappings WHERE category_id = ? AND subcategory_id IS NULL', [id]);

        // 2. Insert new ones if not empty
        if (brandIds) {
          if (typeof brandIds === 'string') brandIds = brandIds.split(',').filter(Boolean);
          if (Array.isArray(brandIds) && brandIds.length > 0) {
            const values = brandIds.map(bid => [parseInt(bid), id, null]);
            await promiseDb.query('INSERT IGNORE INTO brand_mappings (brand_id, category_id, subcategory_id) VALUES ?', [values]);
          }
        }
      } catch (mErr) {
        console.error("❌ Error syncing brands for category:", mErr);
      }
    }

    res.json({ message: "✅ Category updated successfully!" });
  });
});

/**
 * DELETE /api/categories/:id
 * Delete category + image
 */
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  // Get image path
  const getSql = "SELECT image FROM categories WHERE id = ?";
  db.query(getSql, [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const imagePath = rows[0].image
      ? path.join(__dirname, "..", rows[0].image)
      : null;

    // Delete record
    const deleteSql = "DELETE FROM categories WHERE id = ?";
    db.query(deleteSql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Failed to delete category" });
      }

      // Delete image file if exists
      if (imagePath) {
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.warn("⚠️ Failed to delete image file:", imagePath);
          }
        });
      }

      res.json({ message: "✅ Category deleted successfully!" });
    });
  });
});

module.exports = router;
