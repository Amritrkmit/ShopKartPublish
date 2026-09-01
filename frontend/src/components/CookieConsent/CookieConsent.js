import React, { useState, useEffect } from 'react';
import './CookieConsent.css';
import { useCookieConsent } from '../../hooks/useCookieConsent';

const CookieConsent = () => {
    const {
        preferences,
        isVisible,
        acceptAll,
        rejectAll,
        savePreferences
    } = useCookieConsent();

    const [showModal, setShowModal] = useState(false);
    const [localPreferences, setLocalPreferences] = useState(preferences);

    // Sync local state when hook state changes (e.g. from local storage load)
    useEffect(() => {
        setLocalPreferences(preferences);
    }, [preferences]);

    // Listen for Footer link click
    useEffect(() => {
        const handleOpenSettings = () => {
            setLocalPreferences(preferences);
            setShowModal(true);
        };
        window.addEventListener('openCookieSettings', handleOpenSettings);
        return () => window.removeEventListener('openCookieSettings', handleOpenSettings);
    }, [preferences]);

    const handleCustomizeOpen = () => {
        setLocalPreferences(preferences); // Reset to saved state
        setShowModal(true);
    };

    const handleCustomizeSave = () => {
        savePreferences(localPreferences);
        setShowModal(false);
    };

    const handleToggle = (key) => {
        // Essential is always true
        if (key === 'essential') return;

        setLocalPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (!isVisible && !showModal) return null;

    return (
        <>
            {/* Main Banner */}
            {isVisible && !showModal && (
                <div className="cookie-banner-container">
                    <div className="cookie-content">
                        <div className="cookie-text">
                            <h3>We value your privacy</h3>
                            <p>
                                We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic.
                                By clicking "Accept All", you consent to our use of cookies.
                            </p>
                        </div>
                        <div className="cookie-actions">
                            <button className="cookie-btn cookie-btn-text" onClick={handleCustomizeOpen}>
                                Customize
                            </button>
                            <button className="cookie-btn cookie-btn-outline" onClick={rejectAll}>
                                Reject All
                            </button>
                            <button className="cookie-btn cookie-btn-primary" onClick={acceptAll}>
                                Accept All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customization Modal */}
            {showModal && (
                <div className="cookie-modal-overlay">
                    <div className="cookie-modal">
                        <div className="cookie-modal-header">
                            <h2>Cookie Preferences</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <div className="cookie-modal-body">
                            <p className="text-sm text-gray-500 mb-4">
                                Manage your cookie preferences below. Essential cookies are required for the website to function.
                            </p>

                            {/* Option: Essential */}
                            <div className="cookie-option">
                                <div className="option-header">
                                    <h4>Strictly Necessary</h4>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={true}
                                            disabled
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <p className="option-desc">
                                    These cookies are essential for the proper functioning of the website, such as login sessions and shopping cart data. They cannot be disabled.
                                </p>
                            </div>

                            {/* Option: Analytics */}
                            <div className="cookie-option">
                                <div className="option-header">
                                    <h4>Analytics & Performance</h4>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={localPreferences.analytics}
                                            onChange={() => handleToggle('analytics')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <p className="option-desc">
                                    Help us understand how visitors interact with the website by collecting and reporting information anonymously.
                                </p>
                            </div>

                            {/* Option: Marketing */}
                            <div className="cookie-option">
                                <div className="option-header">
                                    <h4>Marketing & Ads</h4>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={localPreferences.marketing}
                                            onChange={() => handleToggle('marketing')}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <p className="option-desc">
                                    Used to track visitors across websites to display ads that are relevant and engaging for the individual user.
                                </p>
                            </div>
                        </div>
                        <div className="cookie-modal-footer">
                            <button className="cookie-btn cookie-btn-text" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="cookie-btn cookie-btn-primary" onClick={handleCustomizeSave}>
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CookieConsent;
