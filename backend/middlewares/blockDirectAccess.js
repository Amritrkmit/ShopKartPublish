/**
 * Middleware to prevent direct browser access to API endpoints
 * Only allows requests from the React frontend or with proper headers
 */
const blockDirectAccess = (req, res, next) => {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const acceptHeader = req.get('accept');

    // Allow requests from localhost frontend (React app)
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003'
    ];

    // Check if request is from allowed origin
    if (origin && allowedOrigins.includes(origin)) {
        return next();
    }

    // Check if referer is from allowed origin
    if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
        return next();
    }

    // Check if it's an AJAX request (has XMLHttpRequest header)
    if (req.get('X-Requested-With') === 'XMLHttpRequest') {
        return next();
    }

    // Check if Accept header indicates JSON request (not browser navigation)
    if (acceptHeader && acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')) {
        return next();
    }

    // If none of the above, it's likely direct browser access
    return res.status(403).json({
        error: 'Direct access forbidden',
        message: 'This API endpoint cannot be accessed directly through the browser. Please use the application interface.'
    });
};

module.exports = blockDirectAccess;
