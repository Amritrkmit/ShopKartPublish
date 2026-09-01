const axios = require('axios');

const API_BASE_URL = "http://localhost:6433";

async function debug() {
    try {
        console.log("1. Fetching Categories...");
        const catRes = await axios.get(`${API_BASE_URL}/category`);
        const categories = catRes.data;
        console.log(`Found ${categories.length} categories.`);

        if (categories.length === 0) {
            console.log("No categories found. Exiting.");
            return;
        }

        const firstCategory = categories[0];
        console.log(`2. Testing Category: ${firstCategory.name} (Slug: ${firstCategory.slug})`);

        const url = `${API_BASE_URL}/products?category=${firstCategory.slug}&limit=10`;
        console.log(`Fetching: ${url}`);

        const prodRes = await axios.get(url);
        const products = prodRes.data.products || prodRes.data;

        console.log(`Found ${products.length} products for category '${firstCategory.slug}'.`);

        if (products.length === 0) {
            console.log("WARNING: No products returned. Possible reasons:");
            console.log("- No products linked to this category id");
            console.log("- Slug mismatch");

            // Fetch ALL products to see their category IDs
            console.log("3. Fetching ALL products to check linkage...");
            const allProds = await axios.get(`${API_BASE_URL}/products?limit=5`);
            const all = allProds.data.products || allProds.data;
            all.forEach(p => {
                console.log(`Product: ${p.name}, CatID: ${p.category_id}, Slug: ${p.slug}`);
            });
        } else {
            console.log("Products found! Sample:", products[0].name);
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.log("Response data:", error.response.data);
    }
}

debug();
