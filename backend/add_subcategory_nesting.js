const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const query = "ALTER TABLE subcategories ADD COLUMN parent_id INT DEFAULT NULL;";

const update = async () => {
    console.log("🔄 Adding parent_id to subcategories...");
    db.query(query, (err) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("⚠️ Column parent_id already exists in subcategories.");
            } else {
                console.error("❌ Error:", err.message);
            }
        } else {
            console.log("✅ Added parent_id column.");
        }
        process.exit();
    });
};

update();
