const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const axios = require('axios');
const db = require('./db');
const jwt = require('jsonwebtoken');

const API_URL = `http://localhost:${process.env.PORT || 6440}`; // backend port
const JWT_SECRET = process.env.JWT_SECRET;

async function runTest() {
    try {
        console.log("--- Starting Coupon Flow Verification ---");

        // 1. Create a Test User
        const testEmail = `testuser_${Date.now()}@example.com`;
        const testPass = 'password123';
        console.log(`1. Creating user: ${testEmail}`);

        // We can manually insert user to skip registration flow/OTP
        const [uRes] = await db.promise.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            ['Test User', testEmail, 'hashed_pass_placeholder']);
        const userId = uRes.insertId;
        console.log(`   User Created with ID: ${userId}`);

        // Generate User Token
        const userToken = jwt.sign({ id: userId, email: testEmail }, JWT_SECRET, { expiresIn: '1h' });

        // 2. Create a Test Coupon (Direct DB or Admin API?)
        // Let's use DB to be faster, mimicking Admin action
        const couponCode = `TEST_${Date.now()}`;
        console.log(`2. Creating Coupon: ${couponCode}`);
        const [cRes] = await db.promise.query(
            "INSERT INTO coupons (code, discount_type, discount_value) VALUES (?, 'flat', 100)",
            [couponCode]
        );
        const couponId = cRes.insertId;
        console.log(`   Coupon Created with ID: ${couponId}`);

        // 3. Assign Coupon (Admin API Simulation - Direct DB for now to test FETCH logic)
        console.log(`3. Assigning Coupon to User...`);
        await db.promise.query("INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)", [userId, couponId]);
        console.log(`   Assigned.`);

        // 4. Fetch as User (The critical part)
        console.log(`4. Fetching 'My Coupons' as User...`);
        try {
            const res = await axios.get(`${API_URL}/api/coupons/my-coupons`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });

            console.log(`   Response Status: ${res.status}`);
            console.log(`   Coupons Found: ${res.data.length}`);
            if (res.data.length > 0 && res.data[0].code === couponCode) {
                console.log("   ✅ SUCCESS: Fetched Test Coupon Correctly!");
            } else {
                console.log("   ❌ FAILURE: Coupon not found in list.");
                console.log("   Data:", JSON.stringify(res.data, null, 2));
            }

        } catch (err) {
            console.log("   ❌ API ERROR:", err.message);
            if (err.response) console.log("   Data:", err.response.data);
        }

        // Cleanup
        console.log("\n--- Cleanup ---");
        await db.promise.query("DELETE FROM users WHERE id = ?", [userId]);
        await db.promise.query("DELETE FROM coupons WHERE id = ?", [couponId]);
        console.log("   Test Data Deleted.");
        process.exit(0);

    } catch (err) {
        console.error("Test Script Error:", err);
        process.exit(1);
    }
}

runTest();
