const express = require('express');
const router = express.Router();
const axios = require('axios');

// Reverse Geocode: Convert coordinates to address
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Call Nominatim API with proper headers
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'json',
                lat: lat,
                lon: lon,
                zoom: 18,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'ShopKart-Ecommerce/1.0', // Required by Nominatim
                'Accept-Language': 'en'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Geocoding error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch address',
            message: error.message
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

        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: q,
                format: 'json',
                addressdetails: 1,
                limit: 5
            },
            headers: {
                'User-Agent': 'ShopKart-Ecommerce/1.0',
                'Accept-Language': 'en'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({
            error: 'Failed to search location',
            message: error.message
        });
    }
});

module.exports = router;
