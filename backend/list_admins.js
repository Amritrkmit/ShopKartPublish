require("dotenv").config();
const db = require("./db");
const sql = "SELECT email, name, role FROM users WHERE role = 'admin'";
db.query(sql, (err, results) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
});
