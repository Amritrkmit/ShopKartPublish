const axiosModule = require('../backend/node_modules/axios');
const axios = axiosModule.default || axiosModule;

const API_BASE_URL = "http://localhost:5002/api"; // Backend DB port

async function run() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post(`${API_BASE_URL}/sellers/login`, {
            email: "pointersoftphp@gmail.com",
            password: "1234567890"
        });

        const token = loginRes.data.token;
        const shop_id = loginRes.data.shop?.id || loginRes.data.user?.shop_id;
        console.log("Login Success. Token:", token ? "YES" : "NO");
        console.log("Shop ID:", shop_id);

        const headers = { Authorization: `Bearer ${token}` };

        // Test 1: Dashboard Query (should work)
        console.log("\n2. Dashboard Query (No customization filter):");
        try {
            const dashRes = await axios.get(`${API_BASE_URL}/products`, {
                params: { shop_id: shop_id, limit: 5, include_drafts: true },
                headers
            });
            console.log("Products Found:", dashRes.data.products?.length);
            if (dashRes.data.products?.length > 0) {
                console.log("First Product:", {
                    id: dashRes.data.products[0].id,
                    name: dashRes.data.products[0].name,
                    is_customizable: dashRes.data.products[0].is_customizable,
                    shop_id: dashRes.data.products[0].shop_id
                });
            }
        } catch (e) { console.error("Dashboard Query Failed:", e.message); }

        // Test 2: Product List Query (is_customizable=false)
        console.log("\n3. Product List Query (is_customizable='false'):");
        try {
            const listRes = await axios.get(`${API_BASE_URL}/products`, {
                params: {
                    shop_id: shop_id,
                    limit: 15,
                    include_drafts: true,
                    is_customizable: 'false'
                },
                headers
            });
            console.log("Products Found:", listRes.data.products?.length);
        } catch (e) { console.error("List Query Failed:", e.message); }

        // Test 3: Custom List Query (is_customizable=1)
        console.log("\n4. Custom List Query (is_customizable='true'):");
        try {
            const customRes = await axios.get(`${API_BASE_URL}/products`, {
                params: {
                    shop_id: shop_id,
                    limit: 15,
                    include_drafts: true,
                    is_customizable: 'true'
                },
                headers
            });
            console.log("Products Found:", customRes.data.products?.length);
        } catch (e) { console.error("Custom Query Failed:", e.message); }

    } catch (err) {
        console.error("Critical Error:", err.response?.data || err.message);
    }
}

run();
