const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const alterTable = `
    ALTER TABLE products
    ADD COLUMN status ENUM('draft', 'published') DEFAULT 'published';
`;

db.query(alterTable, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column status already exists.');
        } else {
            console.error('Error adding column:', err);
        }
    } else {
        console.log('Successfully added status column to products table.');
    }
    process.exit();
});
