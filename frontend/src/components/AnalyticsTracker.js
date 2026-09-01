import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const AnalyticsTracker = () => {
    const location = useLocation();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        // Check if admin
        if (location.pathname.startsWith('/admin')) return;

        // Get or create visitor ID
        let visitorId = localStorage.getItem('visitor_id');
        if (!visitorId) {
            visitorId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('visitor_id', visitorId);
        }

        // Get user ID if logged in
        const token = localStorage.getItem("userToken");
        let userId = null;
        if (token) {
            try {
                userId = JSON.parse(atob(token.split('.')[1])).id;
            } catch (e) { }
        }

        // Send pageview
        axios.post(`${API_BASE_URL}/api/analytics/track`, {
            visitor_id: visitorId,
            page_url: location.pathname,
            event_type: 'pageview',
            user_id: userId,
            user_agent: navigator.userAgent
        }).catch(err => {
            console.error("Analytics Error:", err);
        });

    }, [location, API_BASE_URL]);

    return null;
};

export default AnalyticsTracker;
