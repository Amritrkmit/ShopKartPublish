const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");
const fs = require("fs");

const initGroupBuy = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, "group_buy_schema.sql"), "utf8");
        const statements = sql.split(";").filter(st => st.trim());

        for (const statement of statements) {
            await db.promise.query(statement);
            console.log("Executed statement:", statement.trim().substring(0, 50) + "...");
        }

        console.log("Group Buy tables initialized successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to initialize Group Buy tables:", err);
        process.exit(1);
    }
};

initGroupBuy();
