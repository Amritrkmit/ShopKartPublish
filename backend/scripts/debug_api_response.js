const axios = require('axios');

const checkApi = async () => {
    try {
        const res = await axios.get('http://localhost:6442/api/products?tags=best_seller&limit=1');
        const products = res.data.products || res.data;
        if (products.length > 0) {
            console.log("Sample Product:", {
                id: products[0].id,
                slug: products[0].slug,
                url_token: products[0].url_token,
                product_uid: products[0].product_uid
            });
        } else {
            console.log("No products found.");
        }
    } catch (err) {
        console.error("API Error:", err.message);
    }
};

checkApi();
