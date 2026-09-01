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
    db.query('DESCRIBE user_addresses', (err, results) => {
        if (err) console.error(err);
        else console.log(results.map(r => r.Field).join(', '));
        db.end();
    });
});
