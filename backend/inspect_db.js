require('dotenv').config();
const db = require('./db');

async function check() {
    try {
        const [users] = await db.promise.query('DESC users');
        console.log('--- users ---');
        users.forEach(r => console.log(`${r.Field}: ${r.Type}`));

        const [sellers] = await db.promise.query('DESC sellers');
        console.log('\n--- sellers ---');
        sellers.forEach(r => console.log(`${r.Field}: ${r.Type}`));

        const [admins] = await db.promise.query('DESC admins');
        console.log('\n--- admins ---');
        admins.forEach(r => console.log(`${r.Field}: ${r.Type}`));

        const [countUsers] = await db.promise.query('SELECT COUNT(*) as count FROM users');
        const [countSellers] = await db.promise.query('SELECT COUNT(*) as count FROM sellers');
        const [countAdmins] = await db.promise.query('SELECT COUNT(*) as count FROM admins');
        console.log(`\nCounts: Users: ${countUsers[0].count}, Sellers: ${countSellers[0].count}, Admins: ${countAdmins[0].count}`);

        // Check link between sellers and users
        if (sellers.some(s => s.Field === 'user_id')) {
            const [linked] = await db.promise.query('SELECT COUNT(*) as count FROM sellers WHERE user_id IS NOT NULL');
            console.log(`Sellers linked to users: ${linked[0].count}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
