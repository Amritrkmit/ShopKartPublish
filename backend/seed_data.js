const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

const categories = [
    { name: "Electronics", slug: "electronics", image: "/assets/categories/electronics.png" },
    { name: "TVs & Appliances", slug: "tvs-and-appliances", image: "/assets/categories/tvs.png" },
    { name: "Men", slug: "men", image: "/assets/categories/men.png" },
    { name: "Women", slug: "women", image: "/assets/categories/women.png" },
    { name: "Baby & Kids", slug: "baby-and-kids", image: "/assets/categories/kids.png" },
    { name: "Home & Furniture", slug: "home-and-furniture", image: "/assets/categories/home.png" },
    { name: "Sports, Books & More", slug: "sports-books-more", image: "/assets/categories/sports.png" },
    { name: "Flights", slug: "flights", image: "/assets/categories/flights.png" },
    { name: "Offer Zone", slug: "offer-zone", image: "/assets/categories/offers.png" },
    { name: "Grocery", slug: "grocery", image: "/assets/categories/grocery.png" }
];

// Mapping Subcategories to Parent Category Slugs
const subcategories = {
    "electronics": [
        "Mobiles", "Mobile Accessories", "Laptops", "Computer Accessories",
        "Tablets", "Camera", "Speakers", "Smart Wearable Tech",
        "Health Care Appliances", "Network Components"
    ],
    "tvs-and-appliances": [
        "Televisions", "Smart Home Automation", "Air Conditioners", "Refrigerators"
    ],
    "men": [
        "Clothing", "Footwear", "Watches", "Accessories"
    ],
    "women": [
        "Clothing", "Footwear", "Beauty", "Jewellery"
    ]
};

const seed = async () => {
    console.log("🌱 Starting Seeding Process...");

    // 1. Clear Tables (Optional: Disable foreign keys first)
    await query("SET FOREIGN_KEY_CHECKS = 0");
    await query("TRUNCATE TABLE subcategories");
    await query("TRUNCATE TABLE categories");
    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("🧹 Tables Cleared.");

    // 2. Insert Categories
    for (const cat of categories) {
        const result = await query(
            "INSERT INTO categories (name, slug, image, active) VALUES (?, ?, ?, 1)",
            [cat.name, cat.slug, cat.image]
        );
        const catId = result.insertId;
        console.log(`✅ Added Category: ${cat.name} (ID: ${catId})`);

        // 3. Insert Subcategories for this Category
        if (subcategories[cat.slug]) {
            for (const subName of subcategories[cat.slug]) {
                // Fix: Unique slug by prepending category slug
                const subSlug = `${cat.slug}-${subName.toLowerCase().replace(/[\s&]+/g, "-")}`;
                await query(
                    "INSERT INTO subcategories (category_id, name, slug, active) VALUES (?, ?, ?, 1)",
                    [catId, subName, subSlug]
                );
                console.log(`   └─ Added Subcategory: ${subName} (${subSlug})`);
            }
        }
    }

    console.log("✨ Seeding Complete!");
    process.exit();
};

// Helper for Promisified Queries
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

seed().catch(err => {
    console.error("❌ Seeding Failed:", err);
    process.exit(1);
});
