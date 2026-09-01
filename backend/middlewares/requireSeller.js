const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();
const JWT_SECRET = process.env.JWT_SECRET;

async function requireSeller(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(" ")[1];

    if (!token && req.cookies?.sellerToken) {
        token = req.cookies.sellerToken;
    }

    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        console.log(`[AUTH] Verifying seller token...`);
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`[AUTH] Token decoded, seller ID: ${decoded.id}`);

        // STRICT ROLE CHECK: Prevent user/admin tokens from accessing seller dashboard
        if (decoded.role !== 'seller') {
            console.warn(`🛑 Unauthorized seller access attempt: Token has role '${decoded.role}', expected 'seller'`);
            return res.status(403).json({ message: "Forbidden: Seller role required" });
        }

        // Verify from sellers table directly
        const [sellers] = await db.promise.execute(
            "SELECT id, name, email, status FROM sellers WHERE id = ?",
            [decoded.id]
        );

        if (sellers.length === 0) {
            console.log(`[AUTH] Seller with ID ${decoded.id} not found in DB`);
            return res.status(401).json({ message: "Seller not found" });
        }

        req.seller = sellers[0];
        console.log(`[AUTH] Seller authorized: ${req.seller.email}`);
        next();
    } catch (err) {
        console.error(`[AUTH] Token verification failed:`, err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = requireSeller;
