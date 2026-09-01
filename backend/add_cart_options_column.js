require('dotenv').config();
const db = require('./db');

const alterTableQuery = `
  ALTER TABLE cart_items
  ADD COLUMN selected_options JSON DEFAULT NULL;
`;

db.query(alterTableQuery, (err, result) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Column selected_options already exists.');
        } else {
            console.error('❌ Error adding column:', err);
        }
    } else {
        console.log('✅ Successfully added selected_options column to cart_items table.');
    }
    process.exit();
});
