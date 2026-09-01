require('dotenv').config();
const db = require('./db');

console.log('Adding size fields to products table...\n');

// MySQL doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN
// We'll try to add and ignore if they already exist
const alterQuery = `
  ALTER TABLE products 
  ADD COLUMN available_sizes JSON DEFAULT NULL,
  ADD COLUMN size_chart TEXT DEFAULT NULL
`;

db.query(alterQuery, (err, result) => {
    if (err) {
        // Check if error is because columns already exist
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Size fields already exist in products table!');
            process.exit(0);
        }
        console.error('❌ Error adding columns:', err);
        process.exit(1);
    }

    console.log('✅ Successfully added size fields to products table!');
    console.log('   - available_sizes (JSON)');
    console.log('   - size_chart (TEXT)');
    process.exit(0);
});
