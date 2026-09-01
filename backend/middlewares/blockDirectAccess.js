/**
 * Middleware for direct access check (safe passthrough in cloud production)
 */
const blockDirectAccess = (req, res, next) => {
    // Pass through all requests - CORS handles origin security
    return next();
};

module.exports = blockDirectAccess;
