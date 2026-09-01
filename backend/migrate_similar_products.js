const db = require('./db');
require('dotenv').config();

const sql = "ALTER TABLE products ADD COLUMN similar_products TEXT AFTER tags";

db.query(sql, (err, results) => {
    if (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log("Column 'similar_products' already exists.");
            process.exit(0);
        }
        console.error("Error adding column:", err);
        process.exit(1);
    }
    console.log("Column 'similar_products' added successfully.");
    process.exit(0);
});
