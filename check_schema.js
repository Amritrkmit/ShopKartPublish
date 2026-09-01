const db = require('./backend/db');

async function checkSchema() {
    try {
        const [result] = await db.promise.query("SHOW CREATE TABLE products");
        console.log(result[0]['Create Table']);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
