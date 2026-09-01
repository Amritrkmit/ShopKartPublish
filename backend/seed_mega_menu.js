const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require("./db");

// 1. Categories
const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "TVs & Appliances", slug: "tvs-and-appliances" },
    { name: "Men", slug: "men" },
    { name: "Women", slug: "women" },
    { name: "Baby & Kids", slug: "baby-and-kids" },
    { name: "Home & Furniture", slug: "home-and-furniture" },
    { name: "Sports, Books & More", slug: "sports-books-more" },
    { name: "Flights", slug: "flights" },
    { name: "Offer Zone", slug: "offer-zone" },
    { name: "Grocery", slug: "grocery" }
];

// 2. Setup Hierarchy (Category -> SubcatGroup -> Items)
const validStructure = {
    "Electronics": {
        "Mobiles": ["Mi", "Realme", "Samsung", "Infinix", "OPPO", "Apple", "Vivo", "Honor", "Asus", "Poco X2", "realme Narzo 10", "Infinix Hot 9", "IQOO 3", "iPhone SE", "Motorola razr", "realme Narzo 10A", "Motorola g8 power lite"],
        "Mobile Accessories": ["Mobile Cases", "Headphones & Headsets", "Power Banks", "Screenguards", "Memory Cards", "Smart Headphones", "Mobile Cables", "Mobile Chargers", "Mobile Holders"],
        "Smart Wearable Tech": ["Smart Watches", "Smart Glasses (VR)", "Smart Bands"],
        "Health Care Appliances": ["Bp Monitors", "Weighing Scale"],
        "Laptops": ["Gaming Laptops"],
        "Desktop PCs": [],
        "Gaming & Accessories": [],
        "Computer Accessories": ["External Hard Disks", "Pendrives", "Laptop Skins & Decals", "Laptop Bags", "Mouse"],
        "Computer Peripherals": ["Printers & Ink Cartridges", "Monitors"],
        "Tablets": ["Apple iPads"],
        "Camera": ["DSLR & Mirrorless", "Compact & Bridge Cameras", "Sports & Action"],
        "Camera Accessories": ["Lens", "Tripods"],
        "Network Components": ["Routers"],
        "Featured": ["Google Assistant Store", "Laptops on Buyback Guarantee", "Flipkart SmartBuy", "Li-Polymer Power Banks", "Sony PS4 Pro & Slim", "Apple Products", "Microsoft Store", "Lenovo Phab Series", "JBL Speakers", "Smartphones On Buyback Guarantee", "Philips", "Dr. Morepen", "Complete Mobile Protection", "Mobiles No Cost EMI", "Huawei Watch Gt 2e Smart Watch"]
    },
    "TVs & Appliances": {
        "Televisions": ["Samsung", "Mi", "LG", "Sony", "Thomson", "Vu", "Panasonic", "Motorola"],
        "Washing Machines": ["Fully Automatic Front Load", "Fully Automatic Top Load", "Semi Automatic"],
        "Air Conditioners": ["Split ACs", "Window ACs", "Inverter ACs"],
        "Refrigerators": ["Single Door", "Double Door", "Triple Door", "Side by Side"],
        "Kitchen Appliances": ["Microwave Ovens", "Oven Toaster Grills (OTG)", "Juicer/Mixer/Grinder", "Induction Cooktops"],
        "Small Home Appliances": ["Irons", "Water Purifiers", "Fans", "Vacuum Cleaners"],
        "Smart Home Automation": ["Google Nest", "Smart Switches", "Smart Lights"]
    },
    "Men": {
        "Footwear": ["Sports Shoes", "Casual Shoes", "Formal Shoes", "Sandals & Floaters", "Flip-Flops", "Loafers", "Boots", "Running Shoes", "Sneakers"],
        "Clothing": ["Top wear", "Bottom wear", "Suits, Blazers & Waistcoats", "Ties, Socks, Caps & More", "Fabrics"],
        "Men's Grooming": ["Deodorants", "Perfumes", "Beard Care & Grooming", "Shaving & Aftershave"],
        "Watches": ["Fastrack", "Casio", "Titan", "Fossil", "Sonata"],
        "Accessories": ["Backpacks", "Wallets", "Belts", "Sunglasses", "Luggage & Travel"]
    },
    "Women": {
        "Clothing": ["Sarees", "Kurtas & Kurtis", "Dress Material", "Lehenga Choli", "Blouse", "Kurta Sets", "Gowns", "Dupattas", "Leggings & Churidars", "Palazzos", "Shararas"],
        "Western Wear": ["Tops", "Dresses", "Jeans", "Shorts", "Skirts", "Jeggings & Tights", "Trousers & Capris"],
        "Footwear": ["Flats", "Heels", "Wedges", "Casual Shoes", "Sports Shoes", "Boots"],
        "Watches": ["Titan", "Fastrack", "Fossil", "Raga", "Casio", "Dressberry"],
        "Beauty & Grooming": ["Makeup", "Skin Care", "Hair Care", "Fragrances", "Personal Care Appliances"],
        "Jewellery": ["Silver Jewellery", "Precious Jewellery", "Coins and Bars", "Fashion Jewellery"]
    },
    "Baby & Kids": {
        "Kids Clothing": ["Boys' Clothing", "Girls' Clothing", "Baby Boy Clothing", "Baby Girl Clothing"],
        "Kids Footwear": ["Boys' Footwear", "Girls' Footwear", "Baby Footwear"],
        "Toys": ["Remote Control Toys", "Educational Toys", "Soft Toys", "Cars & Die-cast Vehicles", "Outdoor Toys", "Action Figures", "Board Games", "Puzzles"],
        "Baby Care": ["Diapers", "Wipes", "Baby Gear", "Baby Bedding", "Feeding & Nursing", "Bath & Skin Care"]
    },
    "Home & Furniture": {
        "Kitchen & Dining": ["Cookware", "Dinnerware", "Kitchen Tools", "Gas Stoves", "Bakeware", "Coffee Mugs"],
        "Furniture": ["Beds", "Sofas", "Dining Tables", "Chairs", "Shoe Racks", "Cupboards", "Bean Bags"],
        "Home Decor": ["Paintings", "Clocks", "Wall Shelves", "Showpieces", "Plants"],
        "Furnishing": ["Bedsheets", "Curtains", "Cushions & Pillows", "Blankets", "Bath Towels", "Doormats"],
        "Tools & Utility": ["Hand Tools", "Power Tools", "Gardening Tools"]
    },
    "Sports, Books & More": {
        "Sports": ["Cricket", "Badminton", "Cycling", "Football", "Skating", "Camping & Hiking", "Swimming"],
        "Books": ["Entrance Exams", "Academic", "Literature & Fiction", "Non-Fiction", "Young Readers", "Self-Help"],
        "Stationery": ["Pens", "Diaries", "Card Holders", "Desk Organizers", "Calculators"],
        "Exercise Fitness": ["Cardio Equipment", "Home Gym", "Dumbbells", "Yoga Mats"],
        "Auto Accessories": ["Bike Accessories", "Car Accessories", "Helmets"]
    },
    "Grocery": {
        "Staples": ["Dal & Pulses", "Ghee & Oils", "Atta & Flours", "Rice & Rice Products", "Spices", "Salt & Sugar"],
        "Snacks & Beverages": ["Biscuits", "Chips & Namkeen", "Tea & Coffee", "Juices", "Soft Drinks"],
        "Personal Care": ["Soaps", "Shampoos", "Toothpaste", "Skin Care"],
        "Household Care": ["Detergents", "Dishwashers", "Cleaners", "Repellents"]
    }
};


const seed = async () => {
    console.log("🌱 Starting Full Meta Menu Seeding...");

    // Clear old data
    await query("SET FOREIGN_KEY_CHECKS = 0");
    await query("TRUNCATE TABLE subcategories");
    await query("TRUNCATE TABLE categories");
    await query("SET FOREIGN_KEY_CHECKS = 1");

    // Helper map to find Category IDs
    const catMap = {};
    const usedSlugs = new Set(); // Track used slugs to avoid duplicates

    // Helper function to generate unique slug
    const makeUniqueSlug = (baseSlug) => {
        let slug = baseSlug;
        let counter = 1;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        usedSlugs.add(slug);
        return slug;
    };

    // 1. Insert Categories
    for (const cat of categories) {
        // Assume images are roughly at /assets/categories/{slug}.png or similar default
        const res = await query(
            "INSERT INTO categories (name, slug, active, image) VALUES (?, ?, 1, NULL)",
            [cat.name, cat.slug]
        );
        catMap[cat.name] = res.insertId;
        console.log(`✅ Category: ${cat.name}`);
    }

    // 2. Insert Subcategories (Groups) & Items
    for (const [catName, groups] of Object.entries(validStructure)) {
        const catId = catMap[catName];
        if (!catId) continue;

        for (const [groupName, items] of Object.entries(groups)) {
            // Insert Group Header (e.g. "Mobiles") with clean slug
            const baseGroupSlug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const groupSlug = makeUniqueSlug(baseGroupSlug);

            const groupRes = await query(
                "INSERT INTO subcategories (category_id, name, slug, active, parent_id) VALUES (?, ?, ?, 1, NULL)",
                [catId, groupName, groupSlug]
            );
            const groupId = groupRes.insertId;
            console.log(`   📂 Section: ${groupName}`);

            // Insert Items (e.g. "Mi", "Samsung") with clean slug
            for (const item of items) {
                const baseItemSlug = item.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const itemSlug = makeUniqueSlug(baseItemSlug);
                await query(
                    "INSERT INTO subcategories (category_id, name, slug, active, parent_id) VALUES (?, ?, ?, 1, ?)",
                    [catId, item, itemSlug, groupId]
                );
            }
        }
    }

    console.log("✨ Seeding Complete!");
    process.exit();
};

const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

seed();
