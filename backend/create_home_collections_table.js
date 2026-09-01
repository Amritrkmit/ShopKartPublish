const db = require("./db");

const createTables = async () => {
    const collectionsTable = `
    CREATE TABLE IF NOT EXISTS home_collections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      type ENUM('grid', 'feature') NOT NULL DEFAULT 'grid',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      order_index INT DEFAULT 0,
      link_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

    const itemsTable = `
    CREATE TABLE IF NOT EXISTS home_collection_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      collection_id INT NOT NULL,
      title VARCHAR(255),
      subtitle VARCHAR(255),
      offer_text VARCHAR(255),
      image_url VARCHAR(255) NOT NULL,
      link_url VARCHAR(255),
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collection_id) REFERENCES home_collections(id) ON DELETE CASCADE
    )
  `;

    try {
        await db.promise.query(collectionsTable);
        console.log("✅ home_collections table created or already exists.");
        await db.promise.query(itemsTable);
        console.log("✅ home_collection_items table created or already exists.");

        // Check if we already have data
        const [rows] = await db.promise.query("SELECT COUNT(*) as count FROM home_collections");
        if (rows[0].count === 0) {
            console.log("🌱 Seeding initial collections...");

            // 1. Christmas Specials (Grid)
            const [grid1] = await db.promise.query(
                "INSERT INTO home_collections (title, type, order_index) VALUES (?, ?, ?)",
                ["Christmas Specials", "grid", 1]
            );
            const grid1Id = grid1.insertId;

            await db.promise.query(
                "INSERT INTO home_collection_items (collection_id, title, offer_text, image_url, order_index) VALUES ?",
                [[
                    [grid1Id, "Lipstick", "Min. 50% Off", "/assets/collections/placeholder.png", 1],
                    [grid1Id, "Helmets And Riding G...", "Min. 50% Off", "/assets/collections/placeholder.png", 2],
                    [grid1Id, "Soft Drink Products", "Special offer", "/assets/collections/placeholder.png", 3],
                    [grid1Id, "Perfume", "Min. 50% Off", "/assets/collections/placeholder.png", 4]
                ]]
            );

            // 2. End of Season Sale (Grid)
            const [grid2] = await db.promise.query(
                "INSERT INTO home_collections (title, type, order_index) VALUES (?, ?, ?)",
                ["End of Season Sale", "grid", 2]
            );
            const grid2Id = grid2.insertId;

            await db.promise.query(
                "INSERT INTO home_collection_items (collection_id, title, offer_text, image_url, order_index) VALUES ?",
                [[
                    [grid2Id, "Men's Tracksuits", "Min. 50% Off", "/assets/collections/placeholder.png", 1],
                    [grid2Id, "Wrist Watches", "Min. 90% Off", "/assets/collections/placeholder.png", 2],
                    [grid2Id, "Men’s Casual Shoes", "Min. 70% Off", "/assets/collections/placeholder.png", 3],
                    [grid2Id, "Men's Jackets", "Min. 50% Off", "/assets/collections/placeholder.png", 4]
                ]]
            );

            // 3. Furniture (Feature)
            const [feature] = await db.promise.query(
                "INSERT INTO home_collections (title, type, order_index, link_url) VALUES (?, ?, ?, ?)",
                ["Find furnitures that speak to you", "feature", 3, "/category/furniture"]
            );
            const featureId = feature.insertId;

            await db.promise.query(
                "INSERT INTO home_collection_items (collection_id, title, subtitle, image_url, order_index) VALUES ?",
                [[
                    [featureId, "Find furnitures that speak to you", "Discover our Premium Furniture Collection!", "/assets/collections/placeholder.png", 1]
                ]]
            );

            console.log("✅ Seeding completed.");
        }

    } catch (err) {
        console.error("❌ Error setting up collections tables:", err);
    } finally {
        process.exit();
    }
};

createTables();
