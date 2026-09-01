require("dotenv").config();
const db = require("./db");

const alterTable = async () => {
    try {
        const promiseDb = db.promise;
        console.log("Checking products table schema...");

        // Helper to add column if not exists
        const addColumn = async (columnName, columnDef) => {
            try {
                await promiseDb.query(`ALTER TABLE products ADD COLUMN ${columnName} ${columnDef}`);
                console.log(`✅ Added column: ${columnName}`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ Column ${columnName} already exists.`);
                } else {
                    console.error(`❌ Error adding column ${columnName}:`, err.message);
                }
            }
        };

        await addColumn('exchange_available', 'TINYINT(1) DEFAULT 0');
        await addColumn('exchange_discount', 'DECIMAL(10,2) DEFAULT 0');
        await addColumn('warranty', 'VARCHAR(255) DEFAULT NULL');
        await addColumn('warranty_details', 'TEXT DEFAULT NULL');
        await addColumn('payment_details', 'JSON DEFAULT NULL');

        console.log("Schema check complete.");
        process.exit(0);
    } catch (err) {
        console.error("Script failed:", err);
        process.exit(1);
    }
};

alterTable();
