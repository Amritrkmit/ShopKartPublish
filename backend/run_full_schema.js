require("dotenv").config();
const db = require("./db");
const fs = require("fs");
const path = require("path");

async function runSchema() {
    try {
        const schema = fs.readFileSync(path.join(__dirname, "multi_seller_schema.sql"), "utf8");
        console.log(`Schema file size: ${schema.length} bytes`);

        const statements = schema
            .replace(/\/\*[\s\S]*?\*\/|--.*?\n/g, "") // Remove multi-line and single-line comments
            .split(";")
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Running ${statements.length} SQL statements...`);

        // Also add the role migration
        statements.push("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'seller') DEFAULT 'user'");

        for (const sql of statements) {
            try {
                await db.promise.execute(sql);
                console.log("✅ Executed:", sql.substring(0, 50) + "...");
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log("⏭️ Skipping (already exists):", sql.substring(0, 50) + "...");
                } else {
                    console.error("❌ Error executing:", sql.substring(0, 50) + "...");
                    console.error(err.message);
                }
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Critical error:", err);
        process.exit(1);
    }
}

runSchema();
