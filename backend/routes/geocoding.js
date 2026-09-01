const express = require('express');
const router = express.Router();
const axios = require('axios');

// --- Rate limiter for Nominatim (max 1 req/sec) ---
let lastNominatimCall = 0;
const NOMINATIM_MIN_INTERVAL = 1100; // 1.1 seconds between calls

async function throttledNominatimRequest(url, params, headers) {
    const now = Date.now();
    const elapsed = now - lastNominatimCall;
    if (elapsed < NOMINATIM_MIN_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, NOMINATIM_MIN_INTERVAL - elapsed));
    }
    lastNominatimCall = Date.now();
    return axios.get(url, { params, headers, timeout: 5000 });
}

// --- Simple in-memory cache (5 min TTL) ---
const geoCache = new Map();
const GEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
    const entry = geoCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > GEO_CACHE_TTL) {
        geoCache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data) {
    // Cap cache size to prevent memory leaks
    if (geoCache.size > 500) {
        const oldest = geoCache.keys().next().value;
        geoCache.delete(oldest);
    }
    geoCache.set(key, { data, ts: Date.now() });
}

// Reverse Geocode: Convert coordinates to address
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Check cache first
        const cacheKey = `reverse:${lat}:${lon}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        // Call Nominatim API with proper headers and throttling
        const response = await throttledNominatimRequest(
            'https://nominatim.openstreetmap.org/reverse',
            {
                format: 'json',
                lat: lat,
                lon: lon,
                zoom: 18,
                addressdetails: 1
            },
            {
                'User-Agent': 'ShopKart-Ecommerce/1.0', // Required by Nominatim
                'Accept-Language': 'en'
            }
        );

        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(error.response?.status === 429 ? 429 : 500).json({
            error: 'Failed to fetch address',
            message: error.response?.status === 429
                ? 'Rate limited by geocoding service. Please try again shortly.'
                : error.message
        });
    }
});

// Forward Geocode: Convert address to coordinates (for search)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Check cache first
        const cacheKey = `search:${q}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const response = await throttledNominatimRequest(
            'https://nominatim.openstreetmap.org/search',
            {
                q: q,
                format: 'json',
                addressdetails: 1,
                limit: 5
            },
            {
                'User-Agent': 'ShopKart-Ecommerce/1.0',
                'Accept-Language': 'en'
            }
        );

        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(error.response?.status === 429 ? 429 : 500).json({
            error: 'Failed to search location',
            message: error.response?.status === 429
                ? 'Rate limited by geocoding service. Please try again shortly.'
                : error.message
        });
    }
});

module.exports = router;

