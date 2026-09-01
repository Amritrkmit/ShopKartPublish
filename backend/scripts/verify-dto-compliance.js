/**
 * DTO Compliance Verification Script
 * 
 * This script checks API endpoints to ensure no sensitive data is being exposed.
 * Run this after implementing DTOs to verify compliance.
 * 
 * Usage:
 *   node scripts/verify-dto-compliance.js
 * 
 * Or with specific endpoints:
 *   node scripts/verify-dto-compliance.js /api/products /api/orders
 */

const axios = require('axios');

// List of sensitive fields that should NEVER appear in API responses
const SENSITIVE_FIELDS = [
    // Authentication & Security
    'password',
    'password_hash',
    'hashed_password',
    'otp',
    'reset_token',
    'reset_token_expires',
    'verification_token',
    'api_key',
    'secret_key',

    // Internal IDs & References
    'uid', // Internal unique identifier
    'internal_id',
    'seller_id', // Internal reference (use shop_id instead)
    'supplier_id',

    // Financial & Business Data
    'commission_rate',
    'commission_amount',
    'cost_price',
    'profit_margin',
    'seller_payout',
    'payment_gateway_fee',
    'payout_details',
    'payout_account',

    // Banking Information
    'bank_account',
    'bank_name',
    'ifsc_code',
    'account_holder_name',
    'account_number',
    'routing_number',

    // Tax & Legal
    'tax_id',
    'ssn',
    'ein',
    'tax_certificate',

    // Internal Notes & Admin Data
    'internal_notes',
    'admin_notes',
    'admin_flags',
    'moderation_notes',
    'verification_status_internal',

    // Tracking & Analytics
    'ip_address',
    'user_agent',
    'session_id',
    'internal_tracking_id',
    'fraud_score',
    'ab_test_group',

    // Documents & Verification
    'verification_documents',
    'identity_proof',
    'address_proof'
];

// Base URL for API
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:6376';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * Find sensitive fields in an object recursively
 */
function findSensitiveFields(obj, fields, path = '', found = new Set()) {
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            findSensitiveFields(item, fields, `${path}[${index}]`, found);
        });
    } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            // Check if this key is sensitive
            if (fields.includes(key)) {
                found.add(currentPath);
            }

            // Recursively check nested objects
            if (typeof value === 'object' && value !== null) {
                findSensitiveFields(value, fields, currentPath, found);
            }
        }
    }

    return Array.from(found);
}

/**
 * Check a single endpoint for sensitive data
 */
async function checkEndpoint(url, method = 'GET', headers = {}, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${url}`,
            headers,
            validateStatus: () => true // Don't throw on any status
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);

        // Skip if endpoint returned error
        if (response.status >= 400) {
            console.log(`${colors.yellow}⚠️  ${url} - Status ${response.status} (${response.statusText})${colors.reset}`);
            return { url, status: 'skipped', reason: `HTTP ${response.status}` };
        }

        const responseData = response.data;

        // Check for sensitive fields
        const foundFields = findSensitiveFields(responseData, SENSITIVE_FIELDS);

        if (foundFields.length > 0) {
            console.log(`${colors.red}❌ ${url} - EXPOSES SENSITIVE DATA${colors.reset}`);
            console.log(`${colors.red}   Found fields: ${foundFields.join(', ')}${colors.reset}`);
            return { url, status: 'failed', fields: foundFields };
        }

        console.log(`${colors.green}✅ ${url} - Clean${colors.reset}`);
        return { url, status: 'passed' };

    } catch (error) {
        console.log(`${colors.red}❌ ${url} - Error: ${error.message}${colors.reset}`);
        return { url, status: 'error', error: error.message };
    }
}

/**
 * Main verification function
 */
async function runVerification(endpointsToCheck = null) {
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}   DTO Compliance Verification${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`Base URL: ${BASE_URL}\n`);

    // Default endpoints to check (public, no auth required)
    const defaultEndpoints = [
        // Products
        { url: '/api/products', method: 'GET' },
        { url: '/api/products/1', method: 'GET' },
        { url: '/products/1', method: 'GET' },

        // Categories
        { url: '/api/category', method: 'GET' },
        { url: '/category', method: 'GET' },

        // Subcategories
        { url: '/api/subcategory', method: 'GET' },

        // Brands
        { url: '/api/brands', method: 'GET' },

        // Shops
        { url: '/api/shops', method: 'GET' },

        // Collections
        { url: '/api/collections', method: 'GET' },

        // Slider
        { url: '/api/slider', method: 'GET' },

        // Videos
        { url: '/api/videos', method: 'GET' },

        // Promos
        { url: '/api/promos', method: 'GET' },

        // Reviews (public)
        { url: '/reviews/product/1', method: 'GET' },
    ];

    const endpoints = endpointsToCheck || defaultEndpoints;
    const results = [];

    console.log(`Checking ${endpoints.length} endpoints...\n`);

    for (const endpoint of endpoints) {
        const { url, method = 'GET', headers = {}, data = null } =
            typeof endpoint === 'string' ? { url: endpoint } : endpoint;

        const result = await checkEndpoint(url, method, headers, data);
        results.push(result);

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}   Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Skipped: ${skipped}${colors.reset}`);
    console.log(`${colors.red}💥 Errors: ${errors}${colors.reset}`);
    console.log(`\nTotal: ${results.length}`);

    // List failed endpoints
    if (failed > 0) {
        console.log(`\n${colors.red}Failed Endpoints:${colors.reset}`);
        results
            .filter(r => r.status === 'failed')
            .forEach(r => {
                console.log(`  ${r.url}`);
                console.log(`    Fields: ${r.fields.join(', ')}`);
            });
    }

    // Exit with error code if any failures
    if (failed > 0 || errors > 0) {
        console.log(`\n${colors.red}⚠️  Verification FAILED - Please fix the issues above${colors.reset}\n`);
        process.exit(1);
    } else {
        console.log(`\n${colors.green}✅ All checks passed!${colors.reset}\n`);
        process.exit(0);
    }
}

/**
 * Check if endpoint requires authentication
 */
async function checkAuthEndpoints(token) {
    console.log(`\n${colors.magenta}Checking authenticated endpoints...${colors.reset}\n`);

    const headers = {
        'Authorization': `Bearer ${token}`
    };

    const authEndpoints = [
        { url: '/users/me', method: 'GET', headers },
        { url: '/api/orders', method: 'GET', headers },
        { url: '/users/wishlist', method: 'GET', headers },
        { url: '/users/addresses', method: 'GET', headers },
    ];

    await runVerification(authEndpoints);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
    // Check specific endpoints provided as arguments
    const customEndpoints = args.map(url => ({ url }));
    runVerification(customEndpoints);
} else {
    // Check default endpoints
    runVerification();
}

// Export for use in tests
module.exports = {
    checkEndpoint,
    findSensitiveFields,
    SENSITIVE_FIELDS
};
