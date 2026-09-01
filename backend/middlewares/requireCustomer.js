const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

async function requireCustomer(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const extracted = authHeader.split(" ")[1];
        if (extracted && extracted !== 'null' && extracted !== 'undefined') {
            token = extracted;
        }
    }

    if (!token && req.cookies && req.cookies.site_auth_token) {
        token = req.cookies.site_auth_token;
    }

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // STRICT ROLE CHECK: Ensure this is a customer token
        if (decoded.role !== 'user') {
            return res.status(403).json({ message: "Forbidden: Customer role required" });
        }

        // Verify from database - must be in users table
        const [users] = await db.promise.execute("SELECT id, name, email FROM users WHERE id = ?", [decoded.id]);

        if (users.length === 0) return res.status(401).json({ message: "Customer not found" });

        req.user = users[0];
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = requireCustomer;
