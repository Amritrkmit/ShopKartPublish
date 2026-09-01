import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const STORAGE_KEY = 'cookie_preferences';

const DEFAULT_PREFERENCES = {
    essential: true, // Always true and read-only in UI
    analytics: false,
    marketing: false,
    timestamp: null,
    consentGiven: false, // true if user has clicked Accept/Reject/Save
};

export const useCookieConsent = () => {
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage on mount
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPreferences(parsed);
                // If consent was never explicitly given (e.g. old data), show banner
                if (!parsed.consentGiven) {
                    setIsVisible(true);
                }
            } catch (e) {
                console.error("Failed to parse cookie preferences", e);
                setIsVisible(true);
            }
        } else {
            setIsVisible(true);
        }
    }, []);

    const savePreferences = (newPreferences) => {
        const toSave = {
            ...newPreferences,
            essential: true, // Force essential
            timestamp: new Date().toISOString(),
            consentGiven: true
        };

        setPreferences(toSave);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        setIsVisible(false);

        // Log to backend
        // Format: { essential: true, analytics: ..., marketing: ... }
        // We try/catch inside to not block UI if logging fails
        try {
            const token = localStorage.getItem("userToken");
            let userId = null;
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    userId = payload.id;
                } catch (e) { }
            }

            axios.post(`${API_BASE_URL}/api/consent`, {
                preferences: toSave,
                userId: userId
            }).catch(err => console.error("Failed to log consent:", err));
        } catch (e) {
            console.error("Consent log error:", e);
        }
        // Here you would trigger actual scripts enabling/disabling
        // e.g., window.gtag('consent', ...)
    };

    const acceptAll = () => {
        savePreferences({
            essential: true,
            analytics: true,
            marketing: true
        });
    };

    const rejectAll = () => {
        savePreferences({
            essential: true,
            analytics: false,
            marketing: false
        });
    };

    const resetConsent = () => {
        setIsVisible(true);
    };

    return {
        preferences,
        isVisible,
        acceptAll,
        rejectAll,
        savePreferences,
        resetConsent, // To reopen the banner/modal from Footer
        setIsVisible
    };
};
