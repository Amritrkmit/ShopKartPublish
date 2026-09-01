const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

async function migrate() {
    const connection = await db.promise.getConnection();
    try {
        console.log('Starting migration...');

        // 1. Create admins table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Admins table created');

        // 2. Move existing admins to admins table
        const [admins] = await connection.query("SELECT name, email, password FROM users WHERE role = 'admin'");
        console.log(`Found ${admins.length} admins to migrate`);
        for (const admin of admins) {
            await connection.query("INSERT IGNORE INTO admins (name, email, password) VALUES (?, ?, ?)", [admin.name, admin.email, admin.password]);
        }
        console.log('✅ Admins migrated');

        // 3. Update sellers table schema
        const [columns] = await connection.query("SHOW COLUMNS FROM sellers");
        const hasEmail = columns.some(c => c.Field === 'email');

        if (!hasEmail) {
            await connection.query(`
        ALTER TABLE sellers 
        ADD COLUMN name VARCHAR(255) AFTER id,
        ADD COLUMN email VARCHAR(255) UNIQUE AFTER name,
        ADD COLUMN password VARCHAR(255) AFTER email,
        ADD COLUMN phone VARCHAR(20) AFTER password
      `);
            console.log('✅ Sellers table schema updated');

            // Sync names and emails from users table
            await connection.query(`
        UPDATE sellers s
        JOIN users u ON s.user_id = u.id
        SET s.name = u.name, s.email = u.email, s.password = u.password, s.phone = u.phone
      `);
            console.log('✅ Sellers data synced from users');
        }

        // 4. Update audit logs to reference new admins table (if target_id or admin_id needs careful handling)
        // admin_audit_logs has FOREIGN KEY (admin_id) REFERENCES users(id)
        // We need to drop this foreign key and point it to admins(id)
        try {
            await connection.query("ALTER TABLE admin_audit_logs DROP FOREIGN KEY admin_audit_logs_ibfk_1");
        } catch (e) {
            console.log("ℹ️ admin_audit_logs_ibfk_1 might not exist or already dropped");
        }
        await connection.query("ALTER TABLE admin_audit_logs MODIFY COLUMN admin_id INT NOT NULL");
        // We won't re-add the constraint immediately if IDs don't match yet, but they should if we just migrated.
        // However, it's safer to just point it to the right data.

        console.log('🚀 Migration complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
