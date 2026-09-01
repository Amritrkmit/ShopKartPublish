require('dotenv').config();
const db = require('./db');

// Query to show variant relationships with product names
const query = `
  SELECT 
    pr.id as relation_id,
    pr.parent_id,
    p1.name as parent_product_name,
    pr.child_id,
    p2.name as variant_product_name,
    pr.created_at
  FROM product_relations pr
  LEFT JOIN products p1 ON pr.parent_id = p1.id
  LEFT JOIN products p2 ON pr.child_id = p2.id
  ORDER BY pr.created_at DESC
`;

db.query(query, (err, results) => {
    if (err) {
        console.error('❌ Error:', err.message);
    } else {
        console.log(`\n📦 Product Variants (Total: ${results.length})\n`);
        if (results.length > 0) {
            console.table(results);
        } else {
            console.log('No variant relationships found.');
        }
    }
    process.exit();
});
