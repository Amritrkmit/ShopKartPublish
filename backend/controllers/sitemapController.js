const sitemapService = require('../services/sitemapService');
const path = require('path');
const fs = require('fs');

const sitemapController = {
    // Public: Get Sitemap
    getSitemap: (req, res) => {
        try {
            const filePath = path.join(__dirname, '../public/sitemap.xml');

            // Check if file exists
            if (fs.existsSync(filePath)) {
                // If otracker query exists, we can log it if needed, but for now just serve file
                // const { otracker } = req.query; 

                res.header('Content-Type', 'application/xml');
                return res.sendFile(filePath);
            } else {
                // If not exists, try to generate it on the fly
                sitemapService.generateXML()
                    .then(() => {
                        if (fs.existsSync(filePath)) {
                            res.header('Content-Type', 'application/xml');
                            res.sendFile(filePath);
                        } else {
                            res.status(500).send('Sitemap generation failed');
                        }
                    })
                    .catch(e => res.status(500).send(e.message));
            }
        } catch (error) {
            console.error('Sitemap Serve Error:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    // Admin: Force Generate
    generateSitemap: async (req, res) => {
        try {
            console.log('Admin triggered sitemap generation');
            const result = await sitemapService.generateXML();

            if (result.success) {
                res.status(200).json({ message: 'Sitemap generated successfully', timestamp: result.timestamp });
            } else {
                console.error('Sitemap generation failed:', result.error);
                res.status(500).json({ message: 'Failed to generate sitemap', error: result.error?.message || result.error });
            }
        } catch (error) {
            console.error('Admin Sitemap Gen Error:', error);
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    },

    // Public: Get Sitemap JSON
    getSitemapJSON: async (req, res) => {
        try {
            const data = await sitemapService.getSitemapJSON();
            res.json(data);
        } catch (error) {
            console.error('Sitemap JSON Error:', error);
            res.status(500).json({ message: 'Error fetching sitemap data' });
        }
    }
};

module.exports = sitemapController;
