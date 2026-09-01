const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const query = `
CREATE TABLE IF NOT EXISTS marketing_popups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    type ENUM('text', 'image', 'spinner') DEFAULT 'text',
    content JSON,
    trigger_type ENUM('first_visit', 'time_delay', 'exit_intent') DEFAULT 'time_delay',
    trigger_value INT DEFAULT 5,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const runMigration = async () => {
    console.log("Starting marketing_popups migration...");
    try {
        await db.promise.query(query);
        console.log("Successfully created marketing_popups table.");

        // Seed a default spinner popup (inactive)
        const [rows] = await db.promise.query("SELECT * FROM marketing_popups LIMIT 1");
        if (rows.length === 0) {
            const seedContent = {
                text: "Unlock 10% Off Your First Order!",
                coupon: "WELCOME10",
                segments: ["10% OFF", "Try Again", "Free Ship", "5% OFF", "Try Again", "15% OFF"]
            };
            await db.promise.query(
                `INSERT INTO marketing_popups (title, type, content, trigger_type, trigger_value, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Welcome Spinner', 'spinner', JSON.stringify(seedContent), 'first_visit', 5, false]
            );
            console.log("Seeded default popup.");
        }

    } catch (err) {
        console.error("Error creating table:", err);
    }
    process.exit();
};

runMigration();
