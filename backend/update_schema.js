const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const alterQueries = [
    "ALTER TABLE categories ADD COLUMN active BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL;",
    "ALTER TABLE categories ADD COLUMN description TEXT;",
    "ALTER TABLE subcategories ADD COLUMN active BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE subcategories ADD COLUMN description TEXT;"
];

const runQueries = async () => {
    console.log("🔄 Starting Schema Update...");
    for (const query of alterQueries) {
        await new Promise((resolve) => {
            db.query(query, (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️ Column already exists (skipped): ${query}`);
                    } else {
                        console.error(`❌ Error executing: ${query}`, err.message);
                    }
                } else {
                    console.log(`✅ Success: ${query}`);
                }
                resolve();
            });
        });
    }
    console.log("🏁 Schema Update Complete. Press Ctrl+C to exit.");
};

runQueries();
