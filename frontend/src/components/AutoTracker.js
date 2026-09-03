import { useEffect } from 'react';
import axios from 'axios';
import { useCookieConsent } from '../hooks/useCookieConsent';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const AutoTracker = () => {
    const { preferences } = useCookieConsent();

    useEffect(() => {
        // Generate Session ID if missing
        if (!sessionStorage.getItem('event_session_id')) {
            sessionStorage.setItem('event_session_id', Math.random().toString(36).substring(2) + Date.now().toString(36));
        }

        const handleGlobalClick = (e) => {
            // 1. Consent Check & Admin Check
            if (!preferences.analytics) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('📊 AutoTracker: Event blocked (Analytics consent not given)');
                }
                return;
            }
            if (window.location.pathname.startsWith('/admin')) return;

            // 2. Identify Clickable Elements
            const target = e.target.closest('a, button, input[type="submit"], input[type="button"], .clickable');

            if (!target) return;

            // 3. Dynamic Naming Heuristics
            let eventName = 'Click';
            const tagName = target.tagName.toLowerCase();

            if (target.dataset.eventName) {
                eventName = target.dataset.eventName;
            } else if (target.getAttribute('aria-label')) {
                eventName = `Click: ${target.getAttribute('aria-label')}`;
            } else if (target.title) {
                eventName = `Click: ${target.title}`;
            } else if (target.innerText && target.innerText.trim()) {
                const cleanText = target.innerText.replace(/\s+/g, ' ').trim().substring(0, 30);
                eventName = `Click: ${cleanText}`;
            } else {
                // Try finding text in children if it's a container
                const subText = target.textContent?.trim()?.substring(0, 30);
                if (subText) {
                    eventName = `Click: ${subText}`;
                } else {
                    eventName = `Click: ${tagName}${target.id ? '#' + target.id : ''}`;
                }
            }

            // 4. Construct Payload
            const payload = {
                session_id: sessionStorage.getItem('event_session_id'),
                user_id: getUserId(),
                event_name: eventName,
                element_selector: getCssSelector(target),
                page_url: window.location.pathname,
                metadata: {
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                    referrer: document.referrer,
                    x: e.clientX,
                    y: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY
                }
            };

            // 5. Send (Fire & Forget)
            if (process.env.NODE_ENV === 'development') {
                console.log('🚀 AutoTracker: Sending Event:', eventName, payload);
            }
            axios.post(`${API_BASE_URL}/api/events`, payload)
                .then(() => {
                    if (process.env.NODE_ENV === 'development') console.log('✅ AutoTracker: Event logged');
                })
                .catch((err) => {
                    if (process.env.NODE_ENV === 'development') console.error('❌ AutoTracker: Error logging event:', err);
                });
        };

        window.addEventListener('click', handleGlobalClick, true);
        return () => window.removeEventListener('click', handleGlobalClick, true);
    }, [preferences]);

    return null;
};

// Helper: Extract valid User ID from token if available
const getUserId = () => {
    try {
        const token = localStorage.getItem("userToken");
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
    } catch (e) {
        return null;
    }
};

// Helper: Generate simple CSS selector for debugging
const getCssSelector = (el) => {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
        return `.${el.className.split(' ').join('.').substring(0, 20)}`;
    }
    return el.tagName.toLowerCase();
};

export default AutoTracker;
