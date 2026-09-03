const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Setup nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Helper to get table name by role
const getTableByRole = (role) => {
    switch (role) {
        case 'admin': return 'admins';
        case 'seller': return 'sellers';
        default: return 'users';
    }
};

// 1. Forgot Password - Request OTP
router.post("/forgot-password", async (req, res) => {
    const { email, role } = req.body;

    if (!email || !role) {
        console.log("Forgot Password 400 Error. Body:", req.body);
        const missing = [];
        if (!email) missing.push("email");
        if (!role) missing.push("role");
        return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    const table = getTableByRole(role);

    try {
        // Check if user exists
        try {
            const [users] = await db.promise.execute(`SELECT id FROM ${table} WHERE email = ?`, [email]);
            if (users.length === 0) {
                return res.status(404).json({ message: "No account found with this email." });
            }
        } catch (dbErr) {
            console.error("DB Error checking user:", dbErr);
            return res.status(500).json({ message: "Database Error" });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 mins

        // Save to password_resets
        await db.promise.execute(
            "INSERT INTO password_resets (email, otp, role, expires_at) VALUES (?, ?, ?, ?)",
            [email, otp, role, expiresAt]
        );

        // Send Email
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "Reset Password OTP - ShopKart",
                    text: `Your OTP for resetting password is ${otp}. It is valid for 10 minutes.`,
                    html: `<p>Your OTP for resetting password is <b>${otp}</b>.</p><p>It is valid for 10 minutes.</p>`
                });
            } else {
                console.log(`⚠️ SMTP credentials not set. Reset OTP for ${email}: ${otp}`);
            }
        } catch (mailErr) {
            console.error("❌ Nodemailer Error:", mailErr.message);
        }

        res.json({ message: "OTP sent to your email." });

    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// 2. Verify OTP
router.post("/verify-otp", async (req, res) => {
    const { email, otp, role } = req.body;

    if (!email || !otp || !role) {
        return res.status(400).json({ message: "Missing fields" });
    }

    try {
        const [rows] = await db.promise.execute(
            "SELECT * FROM password_resets WHERE email = ? AND otp = ? AND role = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            [email, otp, role]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Invalid or Expired OTP" });
        }

        const { JWT_SECRET } = require("../utils/jwt");
        // Generate a temporary Reset Token
        const token = jwt.sign(
            { email, role, type: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        // DELETE the verified OTP immediately
        await db.promise.execute(
            "DELETE FROM password_resets WHERE email = ? AND role = ?",
            [email, role]
        );

        res.json({ message: "OTP Verified", token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// 3. Reset Password
router.post("/reset-password", async (req, res) => {
    // Accepts token OR otp for backward compatibility if we wanted, but we will switch to token
    const { token, newPassword, email, role } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: "Missing token or password" });
    }

    try {
        const { JWT_SECRET } = require("../utils/jwt");
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure token details match request (optional extra security)
        if (email && (decoded.email !== email || decoded.role !== role)) {
            return res.status(401).json({ message: "Invalid token for this user." });
        }

        if (decoded.type !== 'password_reset') {
            return res.status(401).json({ message: "Invalid token type." });
        }

        const userEmail = decoded.email;
        const userRole = decoded.role;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const table = getTableByRole(userRole);

        // Update Password
        await db.promise.execute(
            `UPDATE ${table} SET password = ? WHERE email = ?`,
            [hashedPassword, userEmail]
        );

        // JWT is stateless, so we rely on expiry. 
        // We already deleted the OTP in verify-otp step.

        res.json({ message: "Password reset successful. You can now login." });

    } catch (err) {
        console.error("Reset Password Error:", err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Session expired. Please request a new OTP." });
        }
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
