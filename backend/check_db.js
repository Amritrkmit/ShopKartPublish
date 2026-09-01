const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [sellers] = await connection.execute('SELECT COUNT(*) as count FROM sellers');
    const [admins] = await connection.execute('SELECT COUNT(*) as count FROM admins');
    const [shops] = await connection.execute('SELECT COUNT(*) as count FROM shops');
    const [products] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const [customProducts] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE is_customizable = 1');

    console.log('--- DB SUMMARY ---');
    console.log('Users:', users[0].count);
    console.log('Sellers:', sellers[0].count);
    console.log('Admins:', admins[0].count);
    console.log('Shops:', shops[0].count);
    console.log('Products:', products[0].count);
    console.log('Customizable Products:', customProducts[0].count);

    const [adminList] = await connection.execute('SELECT id, email, name FROM admins');
    console.log('\n--- ADMIN LIST ---');
    console.table(adminList);

    const [sellerList] = await connection.execute('SELECT id, email, name, status FROM sellers');
    console.log('\n--- SELLER LIST ---');
    console.table(sellerList);

    const [specificUser] = await connection.execute("SELECT id, email, name, role FROM users WHERE email = 'pointersoftphp@gmail.com'");
    console.log("\n--- USER CHECK (pointersoftphp@gmail.com) ---");
    console.table(specificUser);

    const [amritUsers] = await connection.execute("SELECT id, email, name, role FROM users WHERE name LIKE '%Amrit%'");
    console.log("\n--- USER CHECK (Name: Amrit) ---");
    console.table(amritUsers);

    await connection.end();
}

check().catch(console.error);
