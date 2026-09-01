const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const debug = async () => {
    console.log("🔍 Checking DB Content for Electronics...");

    db.query("SELECT * FROM categories WHERE slug = 'electronics'", (err, cats) => {
        if (err || cats.length === 0) return console.log("Category not found");
        const catId = cats[0].id;
        console.log(`Category ID: ${catId}`);

        db.query("SELECT * FROM subcategories WHERE category_id = ?", [catId], (err, subs) => {
            console.log(`Total Subcats found: ${subs.length}`);
            const groups = subs.filter(s => !s.parent_id);
            const items = subs.filter(s => s.parent_id);
            console.log(`Groups (parent_id=null): ${groups.length}`);
            console.log(`Items (parent_id!=null): ${items.length}`);

            if (groups.length === 0) {
                console.log("⚠️ CRITICAL: No Groups found! Dumping first 5 items:");
                console.log(subs.slice(0, 5));
            } else {
                console.log("✅ Groups exist. Example:", groups[0].name);
            }
            process.exit();
        });
    });
};

debug();
