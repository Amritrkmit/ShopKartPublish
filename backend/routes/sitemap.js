const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

// Public Route (mounted at /sitemap usually, but let's handle it)
// If this file is mounted at /api/sitemap, this is for admin mainly.
// If mounted at root level, we can mix.

// Current plan: Mount this at /api/sitemap for Admin and /sitemap for Public in server.js separately or hybrid.
// Let's make this versatile.

// Public: Serve sitemap.xml
router.get("/", sitemapController.getSitemap);

// Public: Serve sitemap JSON (for HTML page)
router.get("/json", sitemapController.getSitemapJSON);

// Admin: Trigger Generation (Protected)
router.post("/generate", requireAdminJWT, sitemapController.generateSitemap);

module.exports = router;
