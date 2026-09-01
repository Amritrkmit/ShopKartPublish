const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

async function requireAdmin(req, res, next) {
    let token = req.cookies?.adminToken;
    // REMOVED: Fallback to Authorization header to prevent user tokens from bleeding into admin context
    // if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    //     token = req.headers.authorization.split(" ")[1];
    // }

    if (!token) return res.status(401).json({ message: "Unauthorized: No admin token" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // EXTRA SECURITY: Ensure the token explicitly claims the 'admin' role
        if (decoded.role !== 'admin') {
            console.warn(`🛑 Unauthorized access attempt: Token has role '${decoded.role}', expected 'admin'`);
            return res.status(403).json({ message: "Forbidden: Admin role required" });
        }

        // Verify from admins table
        const [admins] = await db.promise.execute("SELECT id, name, email FROM admins WHERE id = ?", [decoded.id]);

        if (admins.length === 0) return res.status(401).json({ message: "Admin not found" });

        req.admin = admins[0];
        next();
    } catch (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired admin token" });
    }
}

module.exports = requireAdmin;
