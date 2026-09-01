const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const db = require('./db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
`;

console.log("Creating product_images table...");

db.query(createTableQuery, (err, result) => {
    if (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
    console.log("Table product_images created or already exists.");
    process.exit(0);
});
