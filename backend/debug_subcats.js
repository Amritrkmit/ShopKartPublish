const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const debug = async () => {
    console.log("🔍 Checking Categories and Subcategories...");

    // 1. Get Electronics Category
    db.query("SELECT * FROM categories WHERE slug = 'electronics'", (err, cats) => {
        if (err) return console.error(err);
        if (cats.length === 0) return console.log("❌ Electronics category not found!");

        const cat = cats[0];
        console.log(`✅ Category: ${cat.name} (ID: ${cat.id})`);

        // 2. Get Subcategories
        db.query("SELECT * FROM subcategories WHERE category_id = ?", [cat.id], (err, subs) => {
            if (err) return console.error(err);
            console.log(`📊 Found ${subs.length} subcategories.`);

            // 3. Check Grouping
            const groups = subs.filter(s => !s.parent_id);
            const items = subs.filter(s => s.parent_id);

            console.log(`   📂 Groups (parent_id=NULL): ${groups.length}`);
            groups.forEach(g => console.log(`      - ${g.name} (ID: ${g.id})`));

            console.log(`   📦 Items (parent_id!=NULL): ${items.length}`);
            if (items.length > 0) {
                console.log(`      - Example: ${items[0].name} (Parent: ${items[0].parent_id})`);
            }

            process.exit();
        });
    });
};

debug();
