const db = require('./db');
async function checkTable() {
    try {
        const [rows] = await db.promise.query("SHOW TABLES LIKE 'consent_logs'");
        console.log("Tables found:", rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkTable();
