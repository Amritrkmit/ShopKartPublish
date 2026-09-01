/**
 * Middleware to prevent direct browser access to API endpoints
 * Checks if the request is from a browser (not an API client)
 * and redirects to the frontend app instead of returning raw JSON
 */
const preventDirectBrowserAccess = (req, res, next) => {
    // Check if request accepts HTML (browser request)
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');

    // Check if it's NOT an API request (no JSON accept header or no fetch/axios headers)
    const isApiRequest =
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        req.headers['content-type']?.includes('application/json');

    // If it's a browser request (accepts HTML and not an API request)
    if (acceptsHtml && !isApiRequest) {
        // Redirect to frontend app - let React Router handle it
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const redirectPath = req.originalUrl.replace('/api', '');
        return res.redirect(`${frontendUrl}${redirectPath}`);
    }

    // It's a legitimate API request, proceed
    next();
};

module.exports = preventDirectBrowserAccess;
