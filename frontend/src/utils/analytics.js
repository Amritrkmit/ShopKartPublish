import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

// Helper to get Visitor ID
const getVisitorId = () => {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
        visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('visitor_id', visitorId);
    }
    return visitorId;
};

// Helper to get User ID
const getUserId = () => {
    const token = localStorage.getItem("userToken");
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1])).id;
    } catch (e) {
        return null;
    }
};

/**
 * Track a custom event
 * @param {string} eventName - Name of the event (e.g., 'add_to_cart', 'purchase', 'view_product')
 * @param {object} eventData - Additional data (e.g., product_id, price, order_id)
 */
export const trackEvent = async (eventName, eventData = {}) => {
    try {
        await axios.post(`${API_BASE_URL}/api/analytics/track`, {
            visitor_id: getVisitorId(),
            page_url: window.location.pathname,
            event_type: eventName,
            event_data: eventData,
            user_id: getUserId(),
            user_agent: navigator.userAgent
        });
    } catch (err) {
        console.error("Analytics Track Error:", err);
    }
};
