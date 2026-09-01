require("dotenv").config();
const db = require("./db");

async function addPaymentDetailsField() {
    try {
        console.log("Adding payment_details field to products table...");

        const query = "ALTER TABLE products ADD COLUMN payment_details LONGTEXT NULL";

        try {
            await db.promise.query(query);
            console.log("✅ payment_details column added successfully!");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('duplicate column name')) {
                console.log("⊘ Field already exists.");
            } else {
                throw err;
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

addPaymentDetailsField();
