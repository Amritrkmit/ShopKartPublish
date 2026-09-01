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

// Folder for subcategory images
const uploadFolder = path.join(__dirname, "..", "assets", "subcategories");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 📌 Add subcategory
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  const { name, slug, parentId, parentSubId, active, description, meta_title, meta_description, meta_keywords } = req.body;

  // parentId corresponds to category_id (Main Category)
  // parentSubId corresponds to parent_id (Nested Group)

  if (!name || !slug || !parentId) {
    return res.status(400).json({ message: "Name, slug, and parent category are required" });
  }

  const validParentSubId = (parentSubId === "null" || parentSubId === "undefined" || !parentSubId) ? null : parentSubId;
  const isActive = active === "true" || active === "1" || active === 1;

  const uid = `SUB-${ulid()}`;
  const url_token = crypto.randomBytes(64).toString('hex');

  const sql = `INSERT INTO subcategories (uid, url_token, name, slug, category_id, parent_id, active, description, meta_title, meta_description, meta_keywords) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [uid, url_token, name, slug, parentId, validParentSubId, isActive ? 1 : 0, description || null, meta_title || null, meta_description || null, meta_keywords || null], async (err, result) => {
    if (err) {
      console.error("❌ DB error:", err);
      return res.status(500).json({ message: "Database error", error: err.sqlMessage || err.message });
    }

    const subId = result.insertId;

    // Handle Brand Mappings
    let brandIds = req.body.brandIds;
    if (brandIds) {
      if (typeof brandIds === 'string') brandIds = brandIds.split(',');
      try {
        const promiseDb = db.promise;
        const values = brandIds.map(bid => [parseInt(bid), parentId, subId]);
        await promiseDb.query('INSERT IGNORE INTO brand_mappings (brand_id, category_id, subcategory_id) VALUES ?', [values]);
      } catch (mErr) {
        console.error("❌ Error mapping brands to subcategory:", mErr);
      }
    }

    res.status(201).json({ message: "✅ Subcategory created successfully" });
  });
});

// 📌 Get subcategories by CATEGORY ID (cleaned - no sensitive fields)
router.get("/:catId", (req, res) => {
  const catId = req.params.catId;
  console.log(`🔍 [API] Fetching subcategories for Category ID: ${catId}`);

  const sql = "SELECT * FROM subcategories WHERE category_id = ? ORDER BY id ASC";
  db.query(sql, [catId], (err, results) => {
    if (err) {
      console.error("Error fetching subcategories:", err);
      return res.status(500).json({ message: "DB error" });
    }
    console.log(`✅ [API] Found ${results.length} records for Category ${catId}`);
    if (results.length > 0) {
      console.log(`   - First Item: ID ${results[0].id}, Name: ${results[0].name}, Parent: ${results[0].parent_id}`);
    }

    // Clean the data before sending to frontend
    const cleanedSubcategories = CategoryDTO.toList(results);
    res.json(cleanedSubcategories);
  });
});

// 📌 Get all subcategories (optional filter by category_id) - cleaned
router.get("/", (req, res) => {
  const { category_id } = req.query;

  let sql = `SELECT s.*, c.name as parent_name 
               FROM subcategories s 
               JOIN categories c ON s.category_id = c.id`;

  let params = [];

  if (category_id) {
    sql += ` WHERE s.category_id = ?`;
    params.push(category_id);
  }

  sql += ` ORDER BY s.id DESC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database fetch error" });
    }

    // Clean the data before sending to frontend
    const cleanedSubcategories = CategoryDTO.toList(results);
    res.json(cleanedSubcategories);
  });
});

// 📌 Delete subcategory
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM subcategories WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "✅ Subcategory deleted" });
  });
});

// 📌 Update subcategory
// 📌 Update subcategory
router.put("/:id", requireAdmin, upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, slug, description, parentId, active, meta_title, meta_description, meta_keywords } = req.body;
  const file = req.file;

  const isActive = active === "true" || active === "1" || active === 1;

  // Frontend might send 'parentId', but DB column is 'category_id'
  const validCategoryId = (parentId === "null" || parentId === "undefined" || !parentId) ? null : parentId;

  let sql = "UPDATE subcategories SET name=?, slug=?, description=?, category_id=?, active=?, meta_title=?, meta_description=?, meta_keywords=?";
  const params = [name, slug, description, validCategoryId, isActive ? 1 : 0, meta_title || null, meta_description || null, meta_keywords || null];

  if (file) {
    // Still skipping image update as column was not added in migration
    console.warn("⚠️ Subcategory image upload ignored because 'image' column is missing in DB schema.");
  }

  sql += " WHERE id=?";
  params.push(id);

  db.query(sql, params, async (err, result) => {
    if (err) {
      console.error("❌ DB UPDATE error:", err);
      // Return detailed error for debugging
      return res.status(500).json({ message: "Database error", error: err.sqlMessage || err.message });
    }

    // Handle Brand Mappings (Sync)
    let brandIds = req.body.brandIds;
    if (brandIds !== undefined) {
      try {
        const promiseDb = db.promise;
        // 1. Delete old mappings
        await promiseDb.query('DELETE FROM brand_mappings WHERE subcategory_id = ?', [id]);

        // 2. Insert new ones
        if (brandIds) {
          if (typeof brandIds === 'string') brandIds = brandIds.split(',').filter(Boolean);
          if (Array.isArray(brandIds) && brandIds.length > 0) {
            const values = brandIds.map(bid => [parseInt(bid), validCategoryId, id]);
            await promiseDb.query('INSERT IGNORE INTO brand_mappings (brand_id, category_id, subcategory_id) VALUES ?', [values]);
          }
        }
      } catch (mErr) {
        console.error("❌ Error syncing brands for subcategory:", mErr);
      }
    }

    res.json({ message: "✅ Subcategory updated successfully" });
  });
});

module.exports = router;
