const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

// --- Schema Definition ---
// 1. coupons: Stores the discount rules
// 2. user_coupons: Stores user-specific assignments (for "My Coupons" section)

const createCouponsTable = `
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    discount_type ENUM('flat', 'percentage') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount_value DECIMAL(10, 2) DEFAULT NULL,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

const createUserCouponsTable = `
CREATE TABLE IF NOT EXISTS user_coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    coupon_id INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
)`;

// --- Seed Data (Matches the hardcoded frontend values) ---
const seeds = [
    { code: 'FLAT500', type: 'flat', value: 500, min: 2999, desc: 'Flat ₹500 off on orders above ₹2999' },
    { code: 'SAVE20', type: 'percentage', value: 20, min: 5000, max: 1000, desc: '20% off up to ₹1000 on orders above ₹5000' },
    { code: 'FIRST100', type: 'flat', value: 100, min: 499, desc: 'Flat ₹100 off on orders above ₹499' },
    { code: 'WELCOME10', type: 'percentage', value: 10, min: 0, desc: '10% Welcome Discount' } // From our recent fix
];

const runMigration = async () => {
    try {
        console.log('Creating coupons table...');
        await db.promise.query(createCouponsTable);

        console.log('Creating user_coupons table...');
        await db.promise.query(createUserCouponsTable);

        console.log('Seeding default coupons...');
        for (const seed of seeds) {
            // Check existence
            const [rows] = await db.promise.query("SELECT id FROM coupons WHERE code = ?", [seed.code]);
            if (rows.length === 0) {
                await db.promise.query(
                    `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount_value) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [seed.code, seed.desc, seed.type, seed.value, seed.min, seed.max || null]
                );
                console.log(`+ Seeded ${seed.code}`);
            } else {
                console.log(`- Skipped ${seed.code} (Exists)`);
            }
        }

        console.log('✅ Migration & Seeding Complete');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

runMigration();
