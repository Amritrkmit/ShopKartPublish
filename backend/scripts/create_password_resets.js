const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require('../db');

const createPasswordResetsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      role ENUM('user', 'admin', 'seller') NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_role (email, role)
    );
  `;

    try {
        const connection = await db.promise.getConnection();
        await connection.query(query);
        console.log("✅ password_resets table created successfully.");
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating password_resets table:", error);
        process.exit(1);
    }
};

createPasswordResetsTable();
