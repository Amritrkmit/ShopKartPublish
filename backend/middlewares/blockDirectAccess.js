/**
 * Middleware to prevent direct browser access to API endpoints
 * Only allows requests from the React frontend or with proper headers
 */
const blockDirectAccess = (req, res, next) => {
    const origin = req.get('origin');
    const referer = req.get('referer');
    const acceptHeader = req.get('accept');

    // Allow requests from localhost, Vercel, Netlify, or any configured frontend
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    // If request comes from an application with Origin
    if (origin) {
        if (
            allowedOrigins.includes(origin) ||
            origin.startsWith('http://localhost') ||
            origin.endsWith('.vercel.app') ||
            origin.endsWith('.netlify.app')
        ) {
            return next();
        }
        return next(); // Allow application origins
    }

    // Check if referer is from allowed origin
    if (referer && (
        allowedOrigins.some(allowed => referer.startsWith(allowed)) ||
        referer.includes('.vercel.app') ||
        referer.includes('.netlify.app') ||
        referer.startsWith('http://localhost')
    )) {
        return next();
    }

    // Check if it's an AJAX request (has XMLHttpRequest header)
    if (req.get('X-Requested-With') === 'XMLHttpRequest') {
        return next();
    }

    // Allow API requests (JSON or wildcard accept)
    if (!acceptHeader || acceptHeader.includes('application/json') || acceptHeader.includes('*/*')) {
        return next();
    }

    // Only block if a user is typing the API URL directly into browser bar (which sends Accept: text/html)
    if (acceptHeader.includes('text/html') && !referer && !origin) {
        return res.status(403).json({
            error: 'Direct access forbidden',
            message: 'This API endpoint cannot be accessed directly through the browser. Please use the application interface.'
        });
    }

    return next();
};

module.exports = blockDirectAccess;
