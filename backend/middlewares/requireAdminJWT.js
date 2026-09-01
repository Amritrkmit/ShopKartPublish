const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

function requireAdminJWT(req, res, next) {
  let token = req.cookies?.adminToken;
  console.log(`🔐 requireAdminJWT: Cookie token found: ${!!token}`);

  // Also check Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("🔐 requireAdminJWT: Header token found");
  }
  if (!token) {
    console.log("❌ requireAdminJWT: No token provided");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // STRICT ROLE CHECK: Prevent user/seller tokens from masquerading as admin
    if (decoded.role !== 'admin') {
      console.warn(`🛑 Unauthorized legacy admin access attempt: Token has role '${decoded.role}', expected 'admin'`);
      return res.status(403).json({ message: "Forbidden: Admin role required" });
    }

    req.admin = decoded; // attach admin info to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = requireAdminJWT;

