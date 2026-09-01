const db = require('./db');

const createBrandsTable = `
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    logo VARCHAR(255),
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

db.query(createBrandsTable, (err, results) => {
    if (err) {
        console.error('Error creating brands table:', err);
    } else {
        console.log('Brands table created or already exists.');

        // Optionally seed with current product brands
        db.query('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != ""', (err, rows) => {
            if (!err && rows.length > 0) {
                const brands = rows.map(r => [r.brand]);
                db.query('INSERT IGNORE INTO brands (name) VALUES ?', [brands], (err) => {
                    if (err) console.error('Error seeding brands:', err);
                    else console.log('Seeded brands from products table.');
                    process.exit();
                });
            } else {
                process.exit();
            }
        });
    }
});
