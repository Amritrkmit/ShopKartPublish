const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer storage for collection images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "assets/collections";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

const requireAdminJWT = require("../middlewares/requireAdminJWT");

// 1. GET ALL (Public - for Home Page)
router.get("/", (req, res) => {
    const sql = `
    SELECT c.*, ci.id as item_id, ci.title as item_title, ci.subtitle as item_subtitle, 
           ci.offer_text, ci.image_url, ci.link_url as item_link_url, ci.order_index as item_order
    FROM home_collections c
    LEFT JOIN home_collection_items ci ON c.id = ci.collection_id
    WHERE c.status = 'active'
    ORDER BY c.order_index ASC, ci.order_index ASC
  `;

    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error" });

        // Group items by collection
        const result = rows.reduce((acc, row) => {
            const { id, title, type, status, order_index, link_url, created_at, updated_at, ...item } = row;
            let collection = acc.find(c => c.id === id);
            if (!collection) {
                collection = { id, title, type, status, order_index, link_url, created_at, updated_at, items: [] };
                acc.push(collection);
            }
            if (item.item_id) {
                collection.items.push({
                    id: item.item_id,
                    title: item.item_title,
                    subtitle: item.item_subtitle,
                    offer_text: item.offer_text,
                    image_url: item.image_url,
                    link_url: item.item_link_url,
                    order_index: item.item_order
                });
            }
            return acc;
        }, []);

        res.json(result);
    });
});

// 2. ADMIN: GET ALL
router.get("/admin", requireAdminJWT, (req, res) => {
    const sql = `
    SELECT c.*, ci.id as item_id, ci.title as item_title, ci.subtitle as item_subtitle, 
           ci.offer_text, ci.image_url, ci.link_url as item_link_url, ci.order_index as item_order
    FROM home_collections c
    LEFT JOIN home_collection_items ci ON c.id = ci.collection_id
    ORDER BY c.order_index ASC, ci.order_index ASC
  `;

    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error" });

        const result = rows.reduce((acc, row) => {
            const { id, title, type, status, order_index, link_url, created_at, updated_at, ...item } = row;
            let collection = acc.find(c => c.id === id);
            if (!collection) {
                collection = { id, title, type, status, order_index, link_url, created_at, updated_at, items: [] };
                acc.push(collection);
            }
            if (item.item_id) {
                collection.items.push({
                    id: item.item_id,
                    title: item.item_title,
                    subtitle: item.item_subtitle,
                    offer_text: item.offer_text,
                    image_url: item.image_url,
                    link_url: item.item_link_url,
                    order_index: item.item_order
                });
            }
            return acc;
        }, []);

        res.json(result);
    });
});

// 3. CREATE COLLECTION
router.post("/", requireAdminJWT, (req, res) => {
    const { title, type, status, order_index, link_url } = req.body;
    const sql = "INSERT INTO home_collections (title, type, status, order_index, link_url) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, type || 'grid', status || 'active', order_index || 0, link_url], (err, result) => {
        if (err) return res.status(500).json({ message: "DB error" });
        res.status(201).json({ message: "Collection created", id: result.insertId });
    });
});

// 4. UPDATE COLLECTION
router.put("/:id", requireAdminJWT, (req, res) => {
    const { id } = req.params;
    const { title, type, status, order_index, link_url } = req.body;
    const sql = "UPDATE home_collections SET title = ?, type = ?, status = ?, order_index = ?, link_url = ? WHERE id = ?";
    db.query(sql, [title, type, status || 'active', order_index || 0, link_url, id], (err) => {
        if (err) {
            console.error("❌ DB UPDATE error:", err);
            return res.status(500).json({ message: "DB error" });
        }
        res.json({ message: "Collection updated" });
    });
});

// 5. DELETE COLLECTION
router.delete("/:id", requireAdminJWT, (req, res) => {
    const { id } = req.params;
    // First get all items to delete their images
    const getItemsSql = "SELECT image_url FROM home_collection_items WHERE collection_id = ?";
    db.query(getItemsSql, [id], (err, items) => {
        if (err) return res.status(500).json({ message: "DB error" });

        items.forEach(item => {
            if (item.image_url && !item.image_url.includes("placeholder.png")) {
                const fullPath = path.join(__dirname, "..", item.image_url);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
        });

        const sql = "DELETE FROM home_collections WHERE id = ?";
        db.query(sql, [id], (err) => {
            if (err) return res.status(500).json({ message: "DB error" });
            res.json({ message: "Collection deleted" });
        });
    });
});

// 6. ADD ITEM
router.post("/:id/items", requireAdminJWT, upload.single("image"), (req, res) => {
    const { id } = req.params;
    const { title, subtitle, offer_text, link_url, order_index, image_url: bodyImageUrl } = req.body;

    let image_url = "/assets/collections/placeholder.png";
    if (req.file) {
        image_url = `/assets/collections/${req.file.filename}`;
    } else if (bodyImageUrl) {
        // Strip out the base URL to store relative path
        image_url = bodyImageUrl.replace(/^http:\/\/localhost:\d+/, "").replace(/^https?:\/\/[^\/]+/, "");
        if (!image_url.startsWith("/")) image_url = "/" + image_url;
    }

    const sql = "INSERT INTO home_collection_items (collection_id, title, subtitle, offer_text, image_url, link_url, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [id, title, subtitle, offer_text, image_url, link_url, order_index || 0], (err, result) => {
        if (err) return res.status(500).json({ message: "DB error" });
        res.status(201).json({ message: "Item added", id: result.insertId, image_url });
    });
});

// 7. UPDATE ITEM
router.put("/items/:itemId", requireAdminJWT, upload.single("image"), (req, res) => {
    const { itemId } = req.params;
    const { title, subtitle, offer_text, link_url, order_index, image_url: bodyImageUrl } = req.body;

    // If new image, get old image to delete
    if (req.file) {
        const getOldSql = "SELECT image_url FROM home_collection_items WHERE id = ?";
        db.query(getOldSql, [itemId], (err, rows) => {
            if (!err && rows.length > 0 && rows[0].image_url && !rows[0].image_url.includes("placeholder.png")) {
                const fullPath = path.join(__dirname, "..", rows[0].image_url);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
        });
    }

    let sql, params;
    if (req.file) {
        const image_url = `/assets/collections/${req.file.filename}`;
        sql = "UPDATE home_collection_items SET title = ?, subtitle = ?, offer_text = ?, link_url = ?, order_index = ?, image_url = ? WHERE id = ?";
        params = [title, subtitle, offer_text, link_url, order_index, image_url, itemId];
    } else if (bodyImageUrl) {
        const image_url = bodyImageUrl.replace(/^http:\/\/localhost:\d+/, "").replace(/^https?:\/\/[^\/]+/, "");
        const finalPath = image_url.startsWith("/") ? image_url : "/" + image_url;
        sql = "UPDATE home_collection_items SET title = ?, subtitle = ?, offer_text = ?, link_url = ?, order_index = ?, image_url = ? WHERE id = ?";
        params = [title, subtitle, offer_text, link_url, order_index, finalPath, itemId];
    } else {
        sql = "UPDATE home_collection_items SET title = ?, subtitle = ?, offer_text = ?, link_url = ?, order_index = ? WHERE id = ?";
        params = [title, subtitle, offer_text, link_url, order_index, itemId];
    }

    db.query(sql, params, (err) => {
        if (err) return res.status(500).json({ message: "DB error" });
        res.json({ message: "Item updated" });
    });
});

// 8. DELETE ITEM
router.delete("/items/:itemId", requireAdminJWT, (req, res) => {
    const { itemId } = req.params;
    const getOldSql = "SELECT image_url FROM home_collection_items WHERE id = ?";
    db.query(getOldSql, [itemId], (err, rows) => {
        if (!err && rows.length > 0 && rows[0].image_url && !rows[0].image_url.includes("placeholder.png")) {
            const fullPath = path.join(__dirname, "..", rows[0].image_url);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }

        const sql = "DELETE FROM home_collection_items WHERE id = ?";
        db.query(sql, [itemId], (err) => {
            if (err) return res.status(500).json({ message: "DB error" });
            res.json({ message: "Item deleted" });
        });
    });
});

module.exports = router;
