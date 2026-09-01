require('dotenv').config();
const db = require('./db');

const createTableQuery = `
CREATE TABLE IF NOT EXISTS product_relations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_relation (parent_id, child_id)
);
`;

db.query(createTableQuery, (err, result) => {
    if (err) {
        console.error('❌ Error creating table:', err);
    } else {
        console.log('✅ Successfully created product_relations table.');
    }
    process.exit();
});
