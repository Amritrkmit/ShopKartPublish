const db = require("./db");

const createHomePromosTable = `
CREATE TABLE IF NOT EXISTS home_promos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    offer_text VARCHAR(255),
    image_url VARCHAR(255),
    link_url VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

db.query(createHomePromosTable, (err, result) => {
    if (err) {
        console.error("❌ Error creating home_promos table:", err);
        process.exit(1);
    }
    console.log("✅ home_promos table created or already exists.");

    // Seed initial 6 slots if empty
    const checkSql = "SELECT COUNT(*) as count FROM home_promos";
    db.query(checkSql, (err, rows) => {
        if (err) {
            console.error("❌ Error checking home_promos table:", err);
            process.exit(1);
        }

        if (rows[0].count === 0) {
            console.log("🌱 Seeding initial 6 promo slots...");
            const seedSql = "INSERT INTO home_promos (title, subtitle, offer_text, image_url, link_url) VALUES (?, ?, ?, ?, ?)";
            const initialPromos = [
                ["Jackets, Sweatshirts..", "Trendy & on a budget", "Min. 65% Off", "/assets/promos/placeholder.png", "/ProductCategory"],
                ["Trendy sweaters...", "Snug winter picks", "60-80% Off", "/assets/promos/placeholder.png", "/ProductCategory"],
                ["Trendy kurta sets", "Ethnic vibes only", "Min. 70% Off", "/assets/promos/placeholder.png", "/ProductCategory"],
                ["Trolley bags", "Ready for takeoff", "Min. 30% Off", "/assets/promos/placeholder.png", "/ProductCategory"],
                ["Premium watches", "Snag luxe timepieces", "Up to 55% Off", "/assets/promos/placeholder.png", "/ProductCategory"],
                ["Sports shoes, sneakers...", "Game-ready kicks", "Min. 70% Off", "/assets/promos/placeholder.png", "/ProductCategory"]
            ];

            initialPromos.forEach((promo, index) => {
                db.query(seedSql, promo, (err) => {
                    if (err) console.error(`❌ Error seeding promo ${index + 1}:`, err);
                    if (index === initialPromos.length - 1) {
                        console.log("✅ Seeding completed.");
                        process.exit(0);
                    }
                });
            });
        } else {
            process.exit(0);
        }
    });
});
