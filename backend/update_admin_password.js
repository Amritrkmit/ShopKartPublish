require("dotenv").config();
const db = require("./db");
const bcrypt = require("bcryptjs");

async function updateAdminPassword() {
    const password = "1234567890";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = "UPDATE users SET password = ? WHERE email = 'admin@gmail.com' AND role = 'admin'";
    db.query(sql, [hashedPassword], (err, result) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log("Admin password updated to 'admin123'");
        process.exit(0);
    });
}

updateAdminPassword();
