const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const repairRewards = async () => {
    try {
        console.log("🔍 Checking for scratched rewards without transactions...");

        // Find rewards that are SCRATCHED but don't have a transaction entry
        const [scratchedRewards] = await db.promise.query(`
            SELECT ur.* 
            FROM user_rewards ur
            LEFT JOIN supercoin_transactions st ON ur.order_id = st.order_id AND st.type = 'EARNED'
            WHERE ur.status = 'SCRATCHED' AND st.id IS NULL
        `);

        if (scratchedRewards.length === 0) {
            console.log("✅ No missing transactions found. Your database is consistent.");
            process.exit();
        }

        console.log(`🛠 Found ${scratchedRewards.length} missing transactions. Repairing...`);

        for (const reward of scratchedRewards) {
            const expiryDate = new Date(reward.scratched_at);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);

            await db.promise.query(`
                INSERT INTO supercoin_transactions (user_id, amount, type, description, order_id, expiry_date, created_at)
                VALUES (?, ?, 'EARNED', 'Order Reward Scratch Card (Repaired)', ?, ?, ?)
            `, [reward.user_id, reward.reward_value, reward.order_id, expiryDate, reward.scratched_at]);

            console.log(`   - Repaired reward for Order ID ${reward.order_id}: ${reward.reward_value} coins.`);
        }

        console.log("🎉 Successfully repaired all missing transactions.");
        process.exit();
    } catch (err) {
        console.error("❌ Error repairing rewards:", err);
        process.exit(1);
    }
};

repairRewards();
