const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");

async function fixSellerRoles() {
    try {
        console.log("Checking for sellers with incorrect 'user' role...");

        // Find users who have a seller record but are not role='seller'
        const [rows] = await db.promise.query(`
            SELECT u.id, u.name, u.email, u.role 
            FROM users u
            JOIN sellers s ON u.id = s.user_id
            WHERE u.role != 'seller' AND u.role != 'admin'
        `);

        if (rows.length === 0) {
            console.log("✅ All sellers have correct roles.");
        } else {
            console.log(`⚠️ Found ${rows.length} sellers with wrong role:`);
            console.log(rows);

            // Update them
            const ids = rows.map(r => r.id);
            if (ids.length > 0) {
                await db.promise.query(`UPDATE users SET role='seller' WHERE id IN (?)`, [ids]);
                console.log(`✅ Updated ${ids.length} users to 'seller' role.`);
            }
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixSellerRoles();
