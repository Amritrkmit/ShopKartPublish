const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const promiseDb = db.promise;

const run = async () => {
    try {
        const [rows] = await promiseDb.query("SHOW COLUMNS FROM products");
        console.log("Columns in products table:");
        rows.forEach(r => console.log(`- ${r.Field} (${r.Type})`));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
