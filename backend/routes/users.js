const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const authMiddleware = require("../middlewares/requireCustomer");
const Joi = require("joi"); // Validation Library
require("dotenv").config();

const { JWT_SECRET, JWT_EXPIRES_IN } = require("../utils/jwt");

// Setup nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // or your SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ----------------- SEND OTP -----------------
router.post("/send-otp", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "Please fill all fields" });

  try {
    // Check if already registered
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length > 0)
        return res.status(400).json({ message: "User already exists" });

      // Check across other tables for strict isolation
      const [adminCheck] = await db.promise.execute("SELECT id FROM admins WHERE email = ?", [email]);
      if (adminCheck.length > 0) {
        return res.status(400).json({ message: "This email is registered as an administrator and cannot be used for customer accounts." });
      }

      const [sellerCheck] = await db.promise.execute("SELECT id FROM sellers WHERE email = ?", [email]);
      if (sellerCheck.length > 0) {
        return res.status(400).json({ message: "This email is registered as a merchant. Please use a different email for your customer account." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 min expiry

      // Insert or update pending user
      db.query(
        "INSERT INTO pending_users (name, email, password, otp, expires_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, password=?, otp=?, expires_at=?",
        [name, email, hashedPassword, otp, expiresAt, name, hashedPassword, otp, expiresAt],
        async (err2) => {
          if (err2) return res.status(500).json({ message: "Database error" });

          // Send email
          try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
              await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Your OTP Code",
                text: `Your OTP is ${otp}`,
              });
            } else {
              console.log(`⚠️ SMTP credentials not set. Generated OTP for ${email}: ${otp}`);
            }
          } catch (mailErr) {
            console.error("❌ Nodemailer Error:", mailErr.message);
          }

          res.json({ message: "OTP sent to email", email, otpDev: process.env.NODE_ENV !== 'production' ? otp : undefined });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- VERIFY OTP -----------------
// ----------------- VERIFY OTP -----------------
router.post("/verify-otp", (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, otp } = req.body;

  db.query(
    "SELECT * FROM pending_users WHERE email = ? AND otp = ?",
    [email, otp], // Prepared statement
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (results.length === 0)
        return res.status(400).json({ message: "Invalid OTP" });

      const pendingUser = results[0];
      if (new Date(pendingUser.expires_at) < new Date())
        return res.status(400).json({ message: "OTP expired" });

      // Insert into real users table
      db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [pendingUser.name, pendingUser.email, pendingUser.password],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "Database insert error" });

          // Cleanup pending table
          db.query("DELETE FROM pending_users WHERE email = ?", [email]);

          // Generate JWT
          const token = jwt.sign(
            { id: result.insertId, email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
          );

          // Set Secure Cookie
          res.cookie('site_auth_token', token, {
            httpOnly: true,
            secure: false, // Force false for localhost debugging
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
          });

          res.json({
            message: "User registered successfully",
            token, // Return token for localStorage fallback
            user: { id: result.insertId, name: pendingUser.name, email },
          });
        }
      );
    }
  );
});


// ----------------- LOGIN -----------------
router.post("/login", async (req, res) => {
  // Input Validation
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];

    // STRICT ROLE ISOLATION: Check if this email belongs to another role's table
    try {
      const [adminCheck] = await db.promise.execute("SELECT id FROM admins WHERE email = ?", [email]);
      const [sellerCheck] = await db.promise.execute("SELECT id FROM sellers WHERE email = ?", [email]);

      if (adminCheck.length > 0 || sellerCheck.length > 0) {
        return res.status(403).json({
          message: "This account is registered with a different role. Please log in through the appropriate portal."
        });
      }
    } catch (e) {
      return res.status(500).json({ message: "Role verification failed" });
    }

    // Role checks
    if (user.role && user.role !== 'user') {
      return res.status(403).json({
        message: `This email is registered as a ${user.role}. Please log in through the ${user.role === 'seller' ? 'Seller Panel' : 'Admin Portal'}.`,
        redirect: user.role === 'seller' ? '/seller/login/' : '/admin/login/'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set Secure Cookie
    res.cookie('site_auth_token', token, {
      httpOnly: true,
      secure: false, // Force false for localhost debugging
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({
      message: "Login successful",
      token, // Return token for localStorage fallback
      user: { id: user.id, name: user.name, email: user.email, role: 'user' },
    });
  });
});

// ----------------- LOGOUT -----------------
router.post("/logout", (req, res) => {
  res.clearCookie('site_auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });
  res.json({ message: "Logged out successfully" });
});


router.get("/me", authMiddleware, (req, res) => {
  const query = "SELECT id, name, email FROM users WHERE id = ?";
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });
    res.json({ ...results[0], role: 'user' });
  });
});

// ----------------- ADD TO WISHLIST -----------------
router.post("/wishlist", authMiddleware, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: "Product ID required" });

  const query = "INSERT INTO wishlist (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at=NOW()";
  db.query(query, [req.user.id, product_id], (err) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Product added to wishlist" });
  });
});

// ----------------- REMOVE FROM WISHLIST -----------------
router.delete("/wishlist/:product_id", authMiddleware, (req, res) => {
  const { product_id } = req.params;

  const query = "DELETE FROM wishlist WHERE user_id = ? AND product_id = ?";
  db.query(query, [req.user.id, product_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Not in wishlist" });
    res.json({ message: "Product removed from wishlist" });
  });
});

// ----------------- GET USER WISHLIST -----------------
router.get("/wishlist", authMiddleware, (req, res) => {
  const query = `
    SELECT 
      w.product_id AS id, 
      p.name, 
      p.slug,
      p.price, 
      p.sale_price,
      p.image,
      p.stock_status,
      p.stock
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    WHERE w.user_id = ?`;

  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ wishlist: results }); // wrap in object to match frontend
  });
});



// ----------------- UPDATE PROFILE -----------------
router.put("/me", authMiddleware, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and Email are required" });

  db.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "Email already in use" });
      return res.status(500).json({ message: "Database Update Error" });
    }
    res.json({ message: "Profile updated successfully", user: { id: req.user.id, name, email } });
  });
});

// ----------------- ADDRESSES -----------------
router.get("/addresses", authMiddleware, (req, res) => {
  const query = "SELECT * FROM user_addresses WHERE user_id = ?";
  db.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    res.json(results);
  });
});

router.post("/addresses", authMiddleware, async (req, res) => {
  const { address_line1, city, state, zip_code, country, type, is_default, full_name, mobile, alternate_mobile, flat_house } = req.body;

  if (!address_line1 || !city || !zip_code || !full_name || !mobile || !flat_house) {
    return res.status(400).json({ message: "Full Name, Mobile, Flat/House, Address, City, Zip are required" });
  }

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();

    // If setting as default, unset others
    if (is_default) {
      await connection.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [req.user.id]);
    }

    const query = `INSERT INTO user_addresses (user_id, address_line1, city, state, zip_code, country, type, is_default, full_name, mobile, alternate_mobile, flat_house) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await connection.query(query, [req.user.id, address_line1, city, state, zip_code, country || 'India', type || 'Home', is_default ? 1 : 0, full_name, mobile, alternate_mobile, flat_house]);

    await connection.commit();
    res.json({ message: "Address added", id: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "DB Insert Error" });
  } finally {
    connection.release();
  }
});

router.put("/addresses/:id", authMiddleware, async (req, res) => {
  const { address_line1, city, state, zip_code, country, type, is_default, full_name, mobile, alternate_mobile, flat_house } = req.body;
  const addressId = req.params.id;

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();

    if (is_default) {
      await connection.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [req.user.id]);
    }

    const query = `UPDATE user_addresses 
                   SET address_line1=?, city=?, state=?, zip_code=?, country=?, type=?, is_default=?, full_name=?, mobile=?, alternate_mobile=?, flat_house=? 
                   WHERE id=? AND user_id=?`;

    await connection.query(query, [address_line1, city, state, zip_code, country, type, is_default ? 1 : 0, full_name, mobile, alternate_mobile, flat_house, addressId, req.user.id]);

    await connection.commit();
    res.json({ message: "Address updated" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "DB Update Error" });
  } finally {
    connection.release();
  }
});

router.delete("/addresses/:id", authMiddleware, (req, res) => {
  const query = "DELETE FROM user_addresses WHERE id = ? AND user_id = ?";
  db.query(query, [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    res.json({ message: "Address deleted" });
  });
});


// ----------------- SUPERCOINS & REWARDS -----------------

// Get current balance and history
router.get("/me/supercoins", authMiddleware, async (req, res) => {
  try {
    const [transactions] = await db.promise.query(
      "SELECT * FROM supercoin_transactions WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    const [streakRows] = await db.promise.query(
      "SELECT total_points FROM user_streaks WHERE user_id = ?",
      [req.user.id]
    );

    const legacyPoints = streakRows.length > 0 ? streakRows[0].total_points : 0;

    // Calculate actual balance (new transactions + legacy points)
    // In a real migration, we'd credit legacy points as a transaction, but for now we combine.
    const netTransactionPoints = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = legacyPoints + netTransactionPoints;

    res.json({
      balance,
      transactions
    });
  } catch (err) {
    console.error("SuperCoin Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch SuperCoins" });
  }
});

// Get pending rewards (unscratched cards)
router.get("/me/rewards", authMiddleware, async (req, res) => {
  try {
    const [rewards] = await db.promise.query(
      "SELECT * FROM user_rewards WHERE user_id = ? AND status = 'PENDING'",
      [req.user.id]
    );
    res.json({ rewards });
  } catch (err) {
    console.error("Rewards Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch rewards" });
  }
});

// Scratch a card
router.post("/me/rewards/:id/scratch", authMiddleware, async (req, res) => {
  const rewardId = req.params.id;
  try {
    const [rewards] = await db.promise.query(
      "SELECT * FROM user_rewards WHERE id = ? AND user_id = ? AND status = 'PENDING'",
      [rewardId, req.user.id]
    );

    if (rewards.length === 0) {
      return res.status(404).json({ message: "Reward not found or already scratched" });
    }

    const reward = rewards[0];
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity

    // Use transaction to ensure both update and insert succeed
    const connection = await db.promise.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Mark as scratched
      await connection.query(
        "UPDATE user_rewards SET status = 'SCRATCHED', scratched_at = NOW() WHERE id = ?",
        [rewardId]
      );

      // 2. Add transaction record
      await connection.query(
        `INSERT INTO supercoin_transactions (user_id, amount, type, description, order_id, expiry_date) 
         VALUES (?, ?, 'EARNED', 'Order Reward Scratch Card', ?, ?)`,
        [req.user.id, reward.reward_value, reward.order_id, expiryDate]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Reward claimed successfully",
        amount: reward.reward_value
      });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("Scratch Reward Error:", err);
    res.status(500).json({ message: "Failed to scratch reward" });
  }
});

module.exports = router;
