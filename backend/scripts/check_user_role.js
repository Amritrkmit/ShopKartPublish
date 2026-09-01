require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

async function checkUser(email) {
    try {
        console.log(`Checking roles for: ${email}`);

        const [users] = await db.promise.execute("SELECT id, name, email FROM users WHERE email = ?", [email]);
        console.log("Users Table:", users);

        const [sellers] = await db.promise.execute("SELECT id, name, email FROM sellers WHERE email = ?", [email]);
        console.log("Sellers Table:", sellers);

        const [admins] = await db.promise.execute("SELECT id, name, email FROM admins WHERE email = ?", [email]);
        console.log("Admins Table:", admins);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser('amritrkmit@gmail.com');
