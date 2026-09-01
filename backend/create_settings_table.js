require('dotenv').config();
const db = require('./db');

async function createSettingsTable() {
    try {
        console.log('🛠 Creating settings table...');

        const sql = `
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_name VARCHAR(50) NOT NULL,
                key_name VARCHAR(100) NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_setting (group_name, key_name)
            )
        `;

        await db.promise.query(sql);
        console.log('✅ Settings table created successfully.');

        // Insert default Price Hunt settings
        const defaults = [
            ['price_hunt', 'title', 'THE GREAT PRICE HUNT'],
            ['price_hunt', 'description', 'Find the hidden treasure items across our store. Visiting a hunt item unlocks an exclusive 20% OFF coupon instantly!'],
            ['price_hunt', 'discount_text', '20% OFF'],
            ['price_hunt', 'is_active', 'true']
        ];

        for (const [group, key, val] of defaults) {
            await db.promise.query(
                "INSERT IGNORE INTO settings (group_name, key_name, value) VALUES (?, ?, ?)",
                [group, key, val]
            );
        }
        console.log('✅ Default Price Hunt settings seeded.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating table:', error);
        process.exit(1);
    }
}

createSettingsTable();
