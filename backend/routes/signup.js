const express = require('express');
const router = express.Router();
const db = require('../db'); 
const bcrypt = require('bcryptjs');  // ✅ add bcrypt

console.log("✅ signup.js loaded");

// Signup route
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill all fields' });
  }

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('❌ DB SELECT error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // ✅ use await inside async function
      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        (err) => {
          if (err) {
            console.error('❌ DB INSERT error:', err);
            return res.status(500).json({ message: 'Database insert error' });
          }
          res.status(201).json({ message: 'User registered successfully!' });
        }
      );
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
