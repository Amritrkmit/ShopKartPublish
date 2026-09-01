const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../db");
const authMiddleware = require("../middlewares/userJWT");

// 1. Get Reviews for a Product
router.get("/product/:productId", (req, res) => {
    const query = `
        SELECT r.id, r.user_id, r.rating, r.delivery_rating, r.packaging_rating, r.comment, r.images, r.created_at, u.name as user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
    `;
    db.query(query, [req.params.productId], (err, results) => {
        if (err) return res.status(500).json({ message: "DB Error" });
        res.json({ reviews: results });
    });
});

// 2. Check if user can review (Has purchased & delivered)
router.get("/can-review/:productId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;

        console.log(`Checking review eligibility for User: ${userId}, Product: ${productId}`);

        // Fetch all orders for this user
        const [orders] = await db.promise.query(`
            SELECT id, items, status
            FROM orders
            WHERE user_id = ?
        `, [userId]);

        console.log(`Raw orders found: ${orders.length}`);

        const hasDelivered = orders.some(order => {
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                const productMatch = items.some(item => {
                    // Be permissive with key names due to data inconsistency
                    const targetId = String(productId);
                    return String(item.product_id) === targetId ||
                        String(item.p_id) === targetId ||
                        String(item.id) === targetId ||
                        String(item.productId) === targetId;
                });
                const isDelivered = order.status?.toLowerCase() === 'delivered';

                if (productMatch) {
                    console.log(`Order ${order.id} matched product ${productId}. Status: ${order.status}`);
                }

                return productMatch && isDelivered;
            } catch (e) {
                console.error("Order items parse error in eligibility check:", e);
                return false;
            }
        });

        if (!hasDelivered) {
            return res.json({ canReview: false, message: "Haven't purchased this product?" });
        }

        // Optional: Check if already reviewed? 
        const [existing] = await db.promise.query(
            "SELECT * FROM reviews WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );

        res.json({
            canReview: true,
            existingReview: existing.length > 0 ? existing[0] : null
        });

    } catch (err) {
        console.error("Check Review Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure Multer for Review Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "../uploads/reviews");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `review-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 2. Add Review (Verified Purchase Only + Images)
router.post("/", authMiddleware, upload.array('images', 5), async (req, res) => {
    const { product_id, rating, comment, delivery_rating, packaging_rating } = req.body;

    if (!product_id || !rating) return res.status(400).json({ message: "Missing fields" });

    try {
        // 1. Verify Purchase
        // Check if user has a DELIVERED order containing this product
        const [allOrders] = await db.promise.query(`
            SELECT id, items, status
            FROM orders
            WHERE user_id = ?
        `, [req.user.id]);

        const hasDelivered = allOrders.some(order => {
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                const productMatch = items.some(item => {
                    const targetId = String(product_id);
                    return String(item.product_id) === targetId ||
                        String(item.p_id) === targetId ||
                        String(item.id) === targetId ||
                        String(item.productId) === targetId;
                });
                const isDelivered = order.status?.toLowerCase() === 'delivered';
                return productMatch && isDelivered;
            } catch (e) {
                return false;
            }
        });

        if (!hasDelivered) {
            // Check if we should block or just warn. Requirement says "Sorry! You are not allowed..."
            // Cleaning up uploaded files if rejected
            if (req.files) {
                req.files.forEach(file => fs.unlinkSync(file.path));
            }
            return res.status(403).json({
                message: "Haven't purchased this product? Sorry! You are not allowed to review this product since you haven't bought it on Flipkart."
            });
        }

        // 2. Check if already reviewed
        const [existing] = await db.promise.query(
            "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
            [req.user.id, product_id]
        );

        if (existing.length > 0) {
            if (req.files) req.files.forEach(file => fs.unlinkSync(file.path));
            return res.status(409).json({ message: "You have already reviewed this product. Please edit your existing review." });
        }

        // 3. Process Images
        const imagePaths = req.files ? req.files.map(file => `/uploads/reviews/${file.filename}`) : [];

        // 4. Insert Review
        await db.promise.query(
            "INSERT INTO reviews (user_id, product_id, rating, comment, delivery_rating, packaging_rating, images) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [req.user.id, product_id, rating, comment, delivery_rating || 5, packaging_rating || 5, JSON.stringify(imagePaths)]
        );

        res.json({ message: "Review added successfully", images: imagePaths });

    } catch (err) {
        console.error("Review Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// 3. Update Review
router.put("/:id", authMiddleware, (req, res) => {
    const { rating, comment, delivery_rating, packaging_rating } = req.body;
    const reviewId = req.params.id;

    if (!rating) return res.status(400).json({ message: "Rating is required" });

    // Verify ownership
    db.query("SELECT user_id FROM reviews WHERE id = ?", [reviewId], (err, results) => {
        if (err) return res.status(500).json({ message: "DB Error" });
        if (results.length === 0) return res.status(404).json({ message: "Review not found" });

        if (results[0].user_id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to edit this review" });
        }

        db.query(
            "UPDATE reviews SET rating = ?, comment = ?, delivery_rating = ?, packaging_rating = ? WHERE id = ?",
            [rating, comment, delivery_rating || 5, packaging_rating || 5, reviewId],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ message: "DB Error" });
                res.json({ message: "Review updated successfully" });
            }
        );
    });
});

// 4. AI-Powered Review Summary (Pros & Cons)
router.get("/summary/:productId", async (req, res) => {
    const { productId } = req.params;

    let reviews = [];
    try {
        // 1. Fetch reviews for the product
        const [results] = await db.promise.query(
            "SELECT comment, rating FROM reviews WHERE product_id = ? AND comment IS NOT NULL AND comment != ''",
            [productId]
        );
        reviews = results;

        if (reviews.length === 0) {
            return res.json({
                summary: "Not enough reviews yet for an AI summary.",
                pros: [],
                cons: []
            });
        }

        // 2. Prepare text for AI
        const allComments = reviews.map(r => `[Rating: ${r.rating}/5] ${r.comment}`).join("\n");
        const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

        if (!HUGGINGFACE_API_KEY) {
            throw new Error("Hugging Face API Key missing");
        }

        // 3. Call Hugging Face
        let response;
        try {
            response = await axios.post(
                "https://router.huggingface.co/models/facebook/bart-large-cnn",
                {
                    inputs: `Summarize these customer reviews into key highlights: \n\n${allComments}`,
                    parameters: {
                        max_length: 150,
                        min_length: 40,
                        do_sample: false
                    }
                },
                {
                    headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` },
                    timeout: 10000 // 10s timeout
                }
            );
        } catch (hfErr) {
            console.error("HF API Error:", hfErr.response?.data || hfErr.message);

            // If model is loading, return a friendly message instead of 500
            if (hfErr.response?.status === 503 || hfErr.response?.data?.error?.includes("loading")) {
                return res.json({
                    summary: "AI summary is being generated for the first time. Please refresh in a few seconds while our models warm up.",
                    pros: ["Authentic Feedback"],
                    cons: []
                });
            }
            throw hfErr; // Re-throw to be caught by main catch
        }

        const summaryText = response.data[0]?.summary_text || "Unable to generate summary at this moment.";

        // Simple heuristic to split into mock pros/cons for UI if the model doesn't format it
        // In a production app, we'd use a more precise prompt-based model like Mistral-7B
        const pros = ["Authentic Feedback", "Verified Purchase"];
        const cons = [];

        res.json({
            summary: summaryText,
            pros: pros,
            cons: cons
        });

    } catch (err) {
        console.error("AI Summary Error:", err.message);

        // HEURISTIC FALLBACK: If AI fails, generate a summary from available reviews
        const totalReviews = (reviews || []).length;
        if (totalReviews === 0) {
            return res.json({
                summary: "Not enough reviews yet for a summary.",
                pros: [],
                cons: []
            });
        }

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

        let heuristicSummary = `Customers have given this product an average rating of ${avgRating.toFixed(1)}/5 stars. `;
        if (avgRating >= 4) {
            heuristicSummary += "Overall, buyers are highly satisfied with their purchase, frequently highlighting its quality and performance.";
        } else if (avgRating >= 3) {
            heuristicSummary += "The sentiment is generally positive, though some users have noted areas for improvement.";
        } else {
            heuristicSummary += "Reviews are mixed, with several customers suggesting caution or pointing out specific issues.";
        }

        const pros = avgRating >= 4 ? ["Highly Rated", "Verified Positive Feedback"] : ["Authentic Reviews"];
        const cons = avgRating < 3 ? ["Mixed Satisfaction"] : [];

        res.json({
            summary: heuristicSummary + " (Summary generated based on user ratings)",
            pros: pros,
            cons: cons,
            is_heuristic: true
        });
    }
});

module.exports = router;
