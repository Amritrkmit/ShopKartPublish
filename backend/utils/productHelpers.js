const db = require('../db');

/**
 * Resolves a numeric Product ID from various identifiers (numeric ID, product_uid, or url_token).
 * @param {string|number} identifier 
 * @returns {Promise<number|null>}
 */
const resolveProductId = async (identifier) => {
    if (!identifier) return null;
    // If it's a number (or string representation of a number), return it
    if (!isNaN(identifier) && !isNaN(parseFloat(identifier))) {
        return parseInt(identifier);
    }

    try {
        const [rows] = await db.promise.query(
            "SELECT id FROM products WHERE product_uid = ? OR url_token = ? LIMIT 1",
            [identifier, identifier]
        );
        return rows.length > 0 ? rows[0].id : null;
    } catch (err) {
        console.error("Error resolving product ID:", err);
        return null;
    }
};

module.exports = {
    resolveProductId
};
