/**
 * Utility functions for generating product URLs
 */

/**
 * Generate a product URL
 * @param {Object} product - Product object
 * @returns {string} Product URL
 */
import { encryptId } from './secureId';

/**
 * Generate a product URL
 * @param {Object} product - Product object
 * @returns {string} Product URL
 */
/**
 * Get encrypted SID for a product based on user context
 */
export const getEncryptedSid = (product) => {
    if (!product) return '';

    // Check if accessed as Admin
    const adminUser = localStorage.getItem('adminUser');

    // Determine the base Shop ID
    const shopId = product.shop_id ? String(product.shop_id) : 'admin';

    let identifierToEncrypt;

    if (adminUser) {
        // Admin View: Encrypt "shopId_adminId"
        identifierToEncrypt = `${shopId}_admin`;
    } else {
        // Normal/Seller View: Encrypt just the Shop ID
        identifierToEncrypt = shopId;
    }

    return encryptId(identifierToEncrypt);
};

export const generateProductUrl = (product, _source = null, _campaign = null, options = {}) => {
    if (!product || !product.slug) {
        console.warn('Product or slug missing:', product);
        return '/';
    }

    const encryptedSid = getEncryptedSid(product);
    const encryptedPid = encryptId(product.id || product.product_uid);

    let url = `/product/${encodeURIComponent(product.slug)}/?sid=${encryptedSid}&p_id=${encryptedPid}`;

    if (options.otracker) {
        url += `&otracker=${options.otracker}`;
    }

    if (options.otracker1) {
        url += `&otracker1=${options.otracker1}`;
    }

    return preserveQueryParams(url);
};

/**
 * Helper to preserve existing query parameters
 */
export const preserveQueryParams = (path) => {
    if (typeof window === 'undefined') return path;

    try {
        const currentParams = new URLSearchParams(window.location.search);
        const [base, query] = path.split('?');
        const newParams = new URLSearchParams(query || '');

        currentParams.forEach((val, key) => {
            if (!newParams.has(key)) {
                newParams.append(key, val);
            }
        });

        const queryString = newParams.toString();
        return queryString ? `${base}?${queryString}` : base;
    } catch (e) {
        return path;
    }
};

/**
 * Generate write review URL
 */
export const generateWriteReviewUrl = (product) => {
    if (!product || !product.slug) return '/';
    const encryptedSid = getEncryptedSid(product);
    const encryptedPid = encryptId(product.id || product.product_uid);
    return `/product/${encodeURIComponent(product.slug)}/write-review?sid=${encryptedSid}&p_id=${encryptedPid}`;
};

/**
 * Generate product reviews URL
 */
export const generateProductReviewsUrl = (product) => {
    if (!product || !product.slug) return '/';
    const encryptedSid = getEncryptedSid(product);
    const encryptedPid = encryptId(product.id || product.product_uid);
    return `/product/${encodeURIComponent(product.slug)}/reviews?sid=${encryptedSid}&p_id=${encryptedPid}`;
};

/**
 * Generate product URL from homepage context
 */
export const generateHomepageProductUrl = (product, section = 'featured') => {
    return generateProductUrl(product, null, null, { otracker: `hp_${section}`, otracker1: 'hp' });
};

/**
 * Generate product URL from category context
 */
export const generateCategoryProductUrl = (product, categorySlug) => {
    return generateProductUrl(product, null, null, { otracker: `category_${categorySlug}`, otracker1: 'category' });
};

/**
 * Generate product URL from search context
 */
export const generateSearchProductUrl = (product, _searchTerm) => {
    return generateProductUrl(product, null, null, { otracker: 'search', otracker1: 'search' });
};

/**
 * Generate product URL from cart context
 */
export const generateCartProductUrl = (product) => {
    return generateProductUrl(product);
};

/**
 * Generate product URL from wishlist context
 */
export const generateWishlistProductUrl = (product) => {
    return generateProductUrl(product);
};

/**
 * Generate product URL from product recommendations
 */
export const generateRecommendationProductUrl = (product) => {
    return generateProductUrl(product);
};

/**
 * Parse UTM parameters - kept for compatibility but returns empty/null
 */
export const parseUtmParams = () => {
    return {
        source: null,
        campaign: null,
        itm: null,
        medium: null,
        content: null,
    };
};
