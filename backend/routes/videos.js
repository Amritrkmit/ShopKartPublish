const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const authMiddleware = require('../middlewares/userJWT');

// Setup storage
const uploadFolder = path.join(__dirname, '..', 'assets', 'videos');
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadFolder),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// GET /api/videos - Fetch video feed
router.get('/', async (req, res) => {
    try {
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (err) { /* ignore invalid token for public feed */ }
        }

        const query = `
            SELECT 
                v.*, 
                p.name as product_name, 
                p.price as product_price, 
                p.sale_price as product_sale_price, 
                p.slug as product_slug,
                p.image as product_image,
                (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likes_count,
                (SELECT COUNT(*) FROM video_comments WHERE video_id = v.id) as comments_count,
                (SELECT id FROM group_buys WHERE product_id = v.product_id AND status = 'active' AND end_time > NOW() LIMIT 1) as group_buy_id
                ${userId ? `, (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id AND user_id = ${userId}) > 0 as is_liked` : ', 0 as is_liked'}
            FROM product_videos v
            JOIN products p ON v.product_id = p.id
            ORDER BY v.created_at DESC
            LIMIT 50
        `;
        const [videos] = await db.promise.query(query);
        res.json(videos);
    } catch (err) {
        console.error("Error fetching video feed:", err);
        res.status(500).json({ message: "Error fetching videos" });
    }
});

// POST /api/videos - Add a video (Admin only)
router.post('/', requireAdminJWT, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    const { product_id, caption, video_url: external_video_url, thumbnail_url: external_thumb_url } = req.body;
    if (!product_id) return res.status(400).json({ message: "Product ID is required" });

    let video_url = external_video_url;
    let thumbnail_url = external_thumb_url;

    if (req.files) {
        if (req.files['video']) {
            video_url = `/assets/videos/${req.files['video'][0].filename}`;
        }
        if (req.files['thumbnail']) {
            thumbnail_url = `/assets/videos/${req.files['thumbnail'][0].filename}`;
        }
    }

    if (!video_url) return res.status(400).json({ message: "No video provided" });

    try {
        console.log("Adding video:", { product_id, video_url, thumbnail_url, caption });
        await db.promise.query(
            "INSERT INTO product_videos (product_id, video_url, thumbnail_url, caption) VALUES (?, ?, ?, ?)",
            [product_id, video_url, thumbnail_url, caption]
        );
        res.json({ message: "Video added successfully" });
    } catch (err) {
        console.error("❌ Error adding video:", err);
        res.status(500).json({ message: "Error adding video", error: err.message });
    }
});

// DELETE /api/videos/:id - Remove a video
router.delete('/:id', requireAdminJWT, async (req, res) => {
    try {
        const [video] = await db.promise.query("SELECT video_url, thumbnail_url FROM product_videos WHERE id = ?", [req.params.id]);
        if (video.length > 0) {
            // Delete local files if they exist
            const filesToDelete = [video[0].video_url, video[0].thumbnail_url];
            filesToDelete.forEach(filePath => {
                if (filePath && filePath.startsWith('/assets/')) {
                    const fullPath = path.join(__dirname, '..', filePath);
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                }
            });
        }
        await db.promise.query("DELETE FROM product_videos WHERE id = ?", [req.params.id]);
        res.json({ message: "Video deleted" });
    } catch (err) {
        console.error("Delete failed:", err);
        res.status(500).json({ message: "Error deleting video" });
    }
});

// PUT /api/videos/:id - Update a video
router.put('/:id', requireAdminJWT, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
    const videoId = req.params.id;
    const { product_id, caption, video_url: external_video_url, thumbnail_url: external_thumb_url } = req.body;

    try {
        const [old] = await db.promise.query("SELECT video_url, thumbnail_url FROM product_videos WHERE id = ?", [videoId]);
        if (!old.length) return res.status(404).json({ message: "Video not found" });

        let video_url = external_video_url || old[0].video_url;
        let thumbnail_url = external_thumb_url || old[0].thumbnail_url;

        // Handle new file uploads
        if (req.files) {
            if (req.files['video']) {
                // Delete old local file if replacing with a new one
                if (old[0].video_url?.startsWith('/assets/')) {
                    const oldPath = path.join(__dirname, '..', old[0].video_url);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                video_url = `/assets/videos/${req.files['video'][0].filename}`;
            }
            if (req.files['thumbnail']) {
                if (old[0].thumbnail_url?.startsWith('/assets/')) {
                    const oldPath = path.join(__dirname, '..', old[0].thumbnail_url);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                thumbnail_url = `/assets/videos/${req.files['thumbnail'][0].filename}`;
            }
        }

        await db.promise.query(
            "UPDATE product_videos SET product_id = ?, video_url = ?, thumbnail_url = ?, caption = ? WHERE id = ?",
            [product_id, video_url, thumbnail_url, caption, videoId]
        );

        res.json({ message: "Video updated successfully" });
    } catch (err) {
        console.error("Update failed:", err);
        res.status(500).json({ message: "Error updating video" });
    }
});

// --- SOCIAL INTERACTIONS ---

// POST /api/videos/:id/like - Toggle like
router.post('/:id/like', authMiddleware, async (req, res) => {
    const videoId = req.params.id;
    const userId = req.user.id;

    try {
        const [existing] = await db.promise.query(
            "SELECT id FROM video_likes WHERE video_id = ? AND user_id = ?",
            [videoId, userId]
        );

        if (existing.length > 0) {
            await db.promise.query("DELETE FROM video_likes WHERE id = ?", [existing[0].id]);
            res.json({ liked: false, message: "Unliked" });
        } else {
            await db.promise.query(
                "INSERT INTO video_likes (video_id, user_id) VALUES (?, ?)",
                [videoId, userId]
            );
            res.json({ liked: true, message: "Liked" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error toggling like" });
    }
});

// GET /api/videos/:id/comments - Fetch comments
router.get('/:id/comments', async (req, res) => {
    try {
        const query = `
            SELECT c.*, u.name as user_name 
            FROM video_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = ?
            ORDER BY c.created_at ASC
        `;
        const [comments] = await db.promise.query(query, [req.params.id]);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: "Error fetching comments" });
    }
});

// POST /api/videos/:id/comments - Post comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ message: "Comment is required" });

    try {
        await db.promise.query(
            "INSERT INTO video_comments (video_id, user_id, comment) VALUES (?, ?, ?)",
            [req.params.id, req.user.id, comment]
        );
        res.json({ message: "Comment posted" });
    } catch (err) {
        res.status(500).json({ message: "Error posting comment" });
    }
});

module.exports = router;
