const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  let token;
  const authHeader = req.headers.authorization; // expects "Bearer TOKEN"

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const extracted = authHeader.split(" ")[1];
    if (extracted && extracted !== 'null' && extracted !== 'undefined') {
      token = extracted;
    }
  }

  if (!token && req.cookies && (req.cookies.token || req.cookies.adminToken || req.cookies.userToken)) {
    // Fallback to cookies (useful for Admin accessing shared routes)
    token = req.cookies.token || req.cookies.adminToken || req.cookies.userToken;
  }

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
