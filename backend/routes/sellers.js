
const express = require("express");
const router = express.Router();
const db = require('../db');
const { ulid } = require('ulid');
const crypto = require('crypto');
const authMiddleware = require("../middlewares/requireCustomer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_jwt_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const multer = require("multer");
const path = require("path");

// Configure Multer for document/logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/sellers/");
    },
    filename: (req, file, cb) => {
        cb(null, `seller-${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// ----------------- SELLER REGISTRATION / ONBOARDING -----------------
router.post("/register", upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "identity_proof", maxCount: 1 },
    { name: "tax_certificate", maxCount: 1 }
]), async (req, res) => {
    const {
        name, email, password, business_name, business_type, tax_id,
        shop_name, shop_description, city, pincode, address,
        bank_holder, bank_account, bank_name, ifsc
    } = req.body;

    if (!email || !password || !business_name || !shop_name) {
        return res.status(400).json({ message: "Missing required fields: Email, Password, Business name, Shop name are required." });
    }

    const logo_url = req.files?.['logo'] ? `/uploads/sellers/${req.files['logo'][0].filename}` : null;
    const id_proof_url = req.files?.['identity_proof'] ? `/uploads/sellers/${req.files['identity_proof'][0].filename}` : null;
    const tax_cert_url = req.files?.['tax_certificate'] ? `/uploads/sellers/${req.files['tax_certificate'][0].filename}` : null;

    let connection;
    try {
        connection = await db.promise.getConnection();
        await connection.beginTransaction();

        // 1. Check for collisions across all tables
        const [userCheck] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
        const [adminCheck] = await connection.execute("SELECT id FROM admins WHERE email = ?", [email]);
        const [sellerCheck] = await connection.execute("SELECT id FROM sellers WHERE email = ?", [email]);

        if (userCheck.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "This email is registered as a customer. Please use a unique email for your merchant account." });
        }
        if (adminCheck.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "This email is registered as an administrator and cannot be used for merchant accounts." });
        }
        if (sellerCheck.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "A merchant profile already exists for this email. Please log in." });
        }

        // 2. Create Seller Profile (independent of users table)
        const hashedPassword = await bcrypt.hash(password, 10);
        const [sellerResult] = await connection.execute(
            "INSERT INTO sellers (name, email, password, business_name, business_type, tax_id, status) VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')",
            [name, email, hashedPassword, business_name, business_type, tax_id]
        );
        const sellerId = sellerResult.insertId;

        // 4. Create Shop Profile
        const shopSlug = shop_name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
        const coords = await geocodeLocation(city, pincode);

        await connection.execute(
            "INSERT INTO shops (seller_id, name, slug, logo_url, description, city, pincode, address_line1, latitude, longitude, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            [sellerId, shop_name, shopSlug, logo_url, shop_description, city, pincode, address, coords.latitude, coords.longitude]
        );

        // 5. Save Bank Details
        await connection.execute(
            "INSERT INTO seller_bank_details(seller_id, account_holder_name, account_number, bank_name, ifsc_code) VALUES(?, ?, ?, ?, ?)",
            [sellerId, bank_holder, bank_account, bank_name, ifsc]
        );

        // 6. Save Documents
        if (id_proof_url) {
            await connection.execute(
                "INSERT INTO seller_documents (seller_id, document_type, document_url) VALUES (?, 'identity_proof', ?)",
                [sellerId, id_proof_url]
            );
        }
        if (tax_cert_url) {
            await connection.execute(
                "INSERT INTO seller_documents (seller_id, document_type, document_url) VALUES (?, 'tax_certificate', ?)",
                [sellerId, tax_cert_url]
            );
        }

        await connection.commit();
        res.json({ message: "Registration successful!", sellerId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("❌ Seller Registration error:", error);
        res.status(500).json({ message: "Error during registration", error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ----------------- SELLER LOGIN -----------------
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Please fill all fields" });

    try {
        // 1. First check users table for role separation check
        const [users] = await db.promise.execute("SELECT id, role FROM users WHERE email = ?", [email]);

        if (users.length > 0 && users[0].role !== 'seller' && users[0].role !== 'admin') {
            return res.status(403).json({
                message: "This email is registered as a customer account. Please log in through the customer login page.",
                isUser: true
            });
        }

        // 1.5 Check admins table
        const [admins] = await db.promise.execute("SELECT id FROM admins WHERE email = ?", [email]);
        if (admins.length > 0) {
            return res.status(403).json({
                message: "Administrative accounts must log in through the Admin Portal.",
                isAdmin: true
            });
        }

        // 2. Fetch from sellers table
        const [sellers] = await db.promise.execute("SELECT * FROM sellers WHERE email = ?", [email]);
        if (sellers.length === 0) return res.status(401).json({ message: "Invalid credentials" });

        const seller = sellers[0];
        const isMatch = await bcrypt.compare(password, seller.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: seller.id, email: seller.email, role: 'seller' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        const [shops] = await db.promise.execute("SELECT id FROM shops WHERE seller_id = ?", [seller.id]);
        const shopId = shops.length > 0 ? shops[0].id : null;

        res.json({
            message: "Login successful",
            token,
            seller: {
                id: seller.id,
                name: seller.name,
                email: seller.email,
                role: 'seller',
                shop_id: shopId
            }
        });
    } catch (err) {
        console.error("Seller login error:", err);
        res.status(500).json({ message: "Database error" });
    }
});

// ----------------- GET SELLER PROFILE -----------------
const requireSellerAuth = require("../middlewares/requireSeller");
router.get("/me", requireSellerAuth, async (req, res) => {
    try {
        const sellerId = req.seller.id;
        console.log('👤 Fetching seller profile for id:', sellerId);
        const [sellers] = await db.promise.execute(`
            SELECT s.*, sh.id as shop_id, sh.name as shop_name, sh.slug as shop_slug, sh.is_active as shop_active, sh.logo_url
            FROM sellers s
            LEFT JOIN shops sh ON s.id = sh.seller_id
            WHERE s.id = ?
    `, [sellerId]);

        if (sellers.length === 0) {
            return res.status(404).json({ message: "Seller profile not found" });
        }

        res.json(sellers[0]);
    } catch (error) {
        console.error('❌ Error fetching seller profile:', error);
        res.status(500).json({ message: "DB Error" });
    }
});

// ----------------- GET SHOP PROFILE (for editing) -----------------
router.get("/profile", requireSellerAuth, async (req, res) => {
    try {
        const sellerId = req.seller.id;
        const [shops] = await db.promise.execute(
            "SELECT * FROM shops WHERE seller_id = ?",
            [sellerId]
        );

        if (shops.length === 0) {
            return res.status(404).json({ message: "Shop not found" });
        }

        res.json(shops[0]);
    } catch (error) {
        console.error("Error fetching shop profile:", error);
        res.status(500).json({ message: "Database error" });
    }
});

/**
 * Geocode a location using Nominatim (OpenStreetMap) API
 * @param {string} city - City name
 * @param {string} pincode - Postal/PIN code
 * @param {string} country - Country name (default: India)
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function geocodeLocation(city, pincode, country = 'India') {
    try {
        // Construct search query - prioritize pincode for accuracy
        const query = pincode ? `${pincode}, ${city}, ${country}` : `${city}, ${country}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;

        console.log(`🌍 Geocoding: ${query}`);

        // Throttle: Nominatim enforces 1 req/sec rate limit
        await new Promise(resolve => setTimeout(resolve, 1500));

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ReactWebsiteApp/1.0' // Required by Nominatim
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            const coords = {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
            console.log(`✅ Geocoded to: ${coords.latitude}, ${coords.longitude}`);
            return coords;
        }

        console.warn(`⚠️ Geocoding failed for ${query}, using India center`);
        // Fallback to India center if geocoding fails
        return { latitude: 20.5937, longitude: 78.9629 };
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        // Fallback to India center on error
        return { latitude: 20.5937, longitude: 78.9629 };
    }
}

// ----------------- UPDATE SHOP PROFILE -----------------
router.put("/profile", requireSellerAuth, upload.single("logo"), async (req, res) => {
    try {
        const sellerId = req.seller.id;
        const { name, description, address_line1, city, pincode } = req.body;

        // Auto-geocode if city or pincode changed
        let updateFields = [];
        let updateValues = [];

        if (name) {
            updateFields.push("name = ?");
            updateValues.push(name);
        }
        if (description !== undefined) {
            updateFields.push("description = ?");
            updateValues.push(description);
        }
        if (address_line1 !== undefined) {
            updateFields.push("address_line1 = ?");
            updateValues.push(address_line1);
        }
        if (city) {
            updateFields.push("city = ?");
            updateValues.push(city);
        }
        if (pincode) {
            updateFields.push("pincode = ?");
            updateValues.push(pincode);
        }

        // Add geocoding if location changed
        if (city || pincode) {
            // Get current shop data to use for geocoding if only one field changed
            const [currentShop] = await db.promise.execute(
                "SELECT city, pincode FROM shops WHERE seller_id = ?",
                [sellerId]
            );
            const geocodeCity = city || currentShop[0]?.city;
            const geocodePincode = pincode || currentShop[0]?.pincode;

            const coords = await geocodeLocation(geocodeCity, geocodePincode);
            console.log(`📍 Updated coordinates for ${geocodeCity}, ${geocodePincode}:`, coords);
            updateFields.push("latitude = ?", "longitude = ?");
            updateValues.push(coords.latitude, coords.longitude);
        }

        if (req.file) {
            const logoUrl = `/uploads/sellers/${req.file.filename}`;
            updateFields.push("logo_url = ?");
            updateValues.push(logoUrl);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        updateValues.push(sellerId);
        const updateQuery = `UPDATE shops SET ${updateFields.join(", ")} WHERE seller_id = ?`;

        await db.promise.execute(updateQuery, updateValues);

        res.json({ message: "Shop profile updated successfully" });
    } catch (error) {
        console.error("Error updating shop profile:", error);
        res.status(500).json({ message: "Database error" });
    }
});

module.exports = router;
