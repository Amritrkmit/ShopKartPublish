const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const createTableQuery = `
CREATE TABLE IF NOT EXISTS category_attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    subcategory_id INT NULL,
    name VARCHAR(100) NOT NULL,
    input_type ENUM('text', 'number', 'select', 'checkbox') DEFAULT 'text',
    options JSON NULL,
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
);
`;

const addColumnQuery = `
ALTER TABLE products ADD COLUMN attributes JSON DEFAULT NULL;
`;

const runMigration = async () => {
    console.log("🚀 Starting Attributes Migration...");

    // 1. Create Table
    db.query(createTableQuery, (err) => {
        if (err) {
            console.error("❌ Error creating table:", err.message);
        } else {
            console.log("✅ Table 'category_attributes' created (or already exists).");
        }

        // 2. Add Column to Products
        db.query(addColumnQuery, (err) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log("⚠️ Column 'attributes' already exists in products.");
                } else {
                    console.error("❌ Error adding column:", err.message);
                }
            } else {
                console.log("✅ Column 'attributes' added to products table.");
            }
            process.exit();
        });
    });
};

runMigration();
