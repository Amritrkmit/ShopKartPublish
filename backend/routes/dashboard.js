const express = require("express");
const router = express.Router();

// ✅ Route to get logged-in user info
router.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

module.exports = router;
