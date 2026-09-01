const mysql = require('mysql2');
require('dotenv').config(); // Load from .env in current directory

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const alterQuery = `
    ALTER TABLE user_addresses 
    ADD COLUMN type VARCHAR(50) DEFAULT 'Home',
    ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
`;

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    db.query(alterQuery, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns already exist.');
            } else {
                console.error('Failed to add columns:', err);
            }
        } else {
            console.log('Successfully added type and is_default columns to user_addresses.');
        }
        db.end();
    });
});
