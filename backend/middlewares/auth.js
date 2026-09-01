const express = require("express");
const router = express.Router();
const db = require("../db");
const sendOTP = require("../utils/mailer");

// ✅ Step 1: Request OTP
router.post("/send-otp", async (req, res) => {
  const { name, email, password } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

  try {
    // Store OTP temporarily in DB
    await db.query(
      "INSERT INTO email_verifications (email, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE)) ON DUPLICATE KEY UPDATE otp=?, expires_at=DATE_ADD(NOW(), INTERVAL 5 MINUTE)",
      [email, otp, otp]
    );

    await sendOTP(email, otp);

    res.json({ message: "OTP sent to email", success: true, name, email, password });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ✅ Step 2: Verify OTP & Signup
router.post("/verify-otp", async (req, res) => {
  const { name, email, password, otp } = req.body;

  try {
    const [rows] = await db.promise.query(
      "SELECT * FROM email_verifications WHERE email = ? AND otp = ? AND expires_at > NOW()",
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Save user in DB
    await db.promise.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, password] // ⚠️ Hash password with bcrypt in production
    );

    // Remove OTP after successful signup
    await db.promise.query("DELETE FROM email_verifications WHERE email = ?", [email]);

    res.json({ message: "Signup successful!", success: true });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

module.exports = router;
