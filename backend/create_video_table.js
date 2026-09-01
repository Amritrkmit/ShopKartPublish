const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const createVideoTable = async () => {
    try {
        await db.promise.query(`
            CREATE TABLE IF NOT EXISTS product_videos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT,
                video_url VARCHAR(512) NOT NULL,
                thumbnail_url VARCHAR(512),
                caption VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'product_videos' table created.");

        // Check if we need to seed
        const [rows] = await db.promise.query("SELECT COUNT(*) as count FROM product_videos");
        if (rows[0].count === 0) {
            console.log("🌱 Seeding product videos...");

            // Get some real product IDs
            const [products] = await db.promise.query("SELECT id FROM products LIMIT 5");

            if (products.length > 0) {
                // Mock video data
                const videos = [
                    {
                        product_id: products[0].id,
                        video_url: "https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4",
                        thumbnail_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80",
                        caption: "Neon Vibes Collection 🌟 #OOTD"
                    },
                    {
                        product_id: products[1] ? products[1].id : products[0].id,
                        video_url: "https://assets.mixkit.co/videos/preview/mixkit-white-sneakers-on-a-young-mans-feet-41662-large.mp4",
                        thumbnail_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80",
                        caption: "Fresh Kicks for Summer 👟 #Sneakerhead"
                    },
                    {
                        product_id: products[2] ? products[2].id : products[0].id,
                        video_url: "https://assets.mixkit.co/videos/preview/mixkit-woman-turning-with-a-red-dress-in-a-field-41584-large.mp4",
                        thumbnail_url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
                        caption: "Elegant Red Dress 💃 #Fashion"
                    }
                ];

                for (const vid of videos) {
                    await db.promise.query(
                        "INSERT INTO product_videos (product_id, video_url, thumbnail_url, caption) VALUES (?, ?, ?, ?)",
                        [vid.product_id, vid.video_url, vid.thumbnail_url, vid.caption]
                    );
                }
                console.log("✅ Seeded sample videos.");
            }
        } else {
            console.log("ℹ️ Videos already exist.");
        }
        process.exit();
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
};

createVideoTable();
