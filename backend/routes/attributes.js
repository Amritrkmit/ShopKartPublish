const express = require("express");
const router = express.Router();
const db = require("../db");

// 1. Create Attribute Definition
router.post("/add", (req, res) => {
    const { category_id, subcategory_id, name, input_type, options, required } = req.body;

    if (!name || (!category_id && !subcategory_id)) {
        return res.status(400).json({ error: "Name and Category/Subcategory ID are required" });
    }

    const sql = `INSERT INTO category_attributes (category_id, subcategory_id, name, input_type, options, required) VALUES (?, ?, ?, ?, ?, ?)`;

    // Store options as JSON string if it's an array/object
    const optionsJson = options ? JSON.stringify(options) : null;

    db.query(sql, [category_id || null, subcategory_id || null, name, input_type || 'text', optionsJson, required ? 1 : 0], (err, result) => {
        if (err) {
            console.error("Error adding attribute:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Attribute added successfully", id: result.insertId });
    });
});

// 2. Get Attributes for a Category (and its Subcategory)
// If subcategory_id is provided, we fetch attributes for BOTH the parent category AND the subcategory
router.get("/", (req, res) => {
    const { category_id, subcategory_id } = req.query;

    let sql = "SELECT * FROM category_attributes WHERE ";
    const params = [];

    if (subcategory_id) {
        // Fetch Attributes that are:
        // 1. Generic for the Category (subcategory_id IS NULL)
        // 2. Specific to THIS Subcategory (subcategory_id = ?)
        sql += "((category_id = ? AND subcategory_id IS NULL) OR subcategory_id = ?)";
        params.push(category_id, subcategory_id);
    } else if (category_id) {
        sql += "category_id = ? AND subcategory_id IS NULL";
        params.push(category_id);
    } else {
        return res.json([]); // No filters
    }

    sql += " ORDER BY id ASC";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching attributes:", err);
            return res.status(500).json({ error: "Database error" });
        }
        // Parse options JSON
        const processed = results.map(attr => ({
            ...attr,
            options: attr.options ? JSON.parse(attr.options) : null,
            required: !!attr.required
        }));
        res.json(processed);
    });
});

// 3. Delete Attribute
router.delete("/:id", (req, res) => {
    db.query("DELETE FROM category_attributes WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ message: "Attribute deleted" });
    });
});

module.exports = router;
