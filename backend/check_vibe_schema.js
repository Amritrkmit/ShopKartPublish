const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const checkSchema = async () => {
    try {
        const [sellersSchema] = await db.promise.query("DESCRIBE sellers");
        const [reviewsSchema] = await db.promise.query("DESCRIBE reviews");

        console.log("--- SELLERS TABLE ---");
        console.table(sellersSchema);

        console.log("\n--- REVIEWS TABLE ---");
        console.table(reviewsSchema);

        process.exit();
    } catch (err) {
        console.error("❌ Error checking schema:", err);
        process.exit(1);
    }
};

checkSchema();
