const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    const query = "ALTER TABLE user_addresses ADD COLUMN type VARCHAR(50) DEFAULT 'Home'";
    db.query(query, (err) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log("Type column already exists");
            else console.error(err);
        } else {
            console.log("Added type column");
        }
        db.end();
    });
});
