const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "shopkart_super_secret_jwt_key_2026_fallback";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

module.exports = {
    JWT_SECRET,
    JWT_EXPIRES_IN
};
