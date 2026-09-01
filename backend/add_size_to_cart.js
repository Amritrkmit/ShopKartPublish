const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

(async () => {
    try {
        console.log("Adding 'size' column to 'cart_items' table...");
        const sql = "ALTER TABLE cart_items ADD COLUMN size VARCHAR(50);";
        db.query(sql, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log("Column 'size' already exists.");
                } else {
                    console.error("Error executing query:", err);
                }
            } else {
                console.log("Successfully added 'size' column.");
            }
            process.exit();
        });
    } catch (e) {
        console.error("Script failed:", e);
        process.exit(1);
    }
})();
