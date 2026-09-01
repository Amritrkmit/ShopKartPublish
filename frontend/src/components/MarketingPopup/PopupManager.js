import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { X, Gift } from 'lucide-react';
import SpinWheel from './SpinWheel';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PopupManager = () => {
    const [popup, setPopup] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [wonCoupon, setWonCoupon] = useState(null);
    const location = useLocation();

    // Do not show on admin pages - Logic moved below hooks to satisfy "Rules of Hooks"

    const checkTrigger = useCallback((data) => {
        const seenKey = `popup_seen_${data.id}`;
        if (localStorage.getItem(seenKey)) return;

        if (data.trigger_type === 'first_visit') {
            // Already checked seenKey, so show it
            setTimeout(() => setIsVisible(true), (data.trigger_value || 0) * 1000);
            setPopup(data);
        } else if (data.trigger_type === 'time_delay') {
            setTimeout(() => {
                setIsVisible(true);
                setPopup(data);
            }, (data.trigger_value || 5) * 1000);
        }
    }, []);

    const fetchPopup = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/popups/active`);
            const data = res.data;
            if (data && data.is_active) {
                checkTrigger(data);
            }
        } catch (err) {
            console.error(err);
        }
    }, [checkTrigger]);

    useEffect(() => {
        if (!location.pathname.startsWith('/admin')) {
            fetchPopup();
        }
    }, [location.pathname, fetchPopup]);

    const handleClose = () => {
        if (popup) {
            localStorage.setItem(`popup_seen_${popup.id}`, 'true');
        }
        setIsVisible(false);
    };

    const handleWin = (segment) => {
        // Simple logic: if segment contains "OFF" or "Ship", show coupon
        // In real world, backend would determine win
        let coupon = "";
        let content = {};

        try {
            content = typeof popup.content === 'string' ? JSON.parse(popup.content) : popup.content;
        } catch (e) { }

        if (segment.includes("Again")) {
            // Try again... or just close? 
            // user gets one spin usually.
        } else {
            coupon = content.coupon || "WELCOME10";
            setWonCoupon(coupon);
        }
    };

    if (location.pathname.startsWith('/admin')) return null;
    if (!isVisible || !popup) return null;

    let content = {};
    try {
        content = typeof popup.content === 'string' ? JSON.parse(popup.content) : popup.content;
    } catch (e) { }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl relative max-w-md w-full overflow-hidden flex flex-col items-center p-8 text-center animate-scale-up">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>

                {!wonCoupon ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{popup.title}</h2>
                        <p className="text-gray-600 mb-6">{content.text}</p>

                        {popup.type === 'spinner' ? (
                            <SpinWheel
                                segments={content.segments || ["10% OFF", "Try Again", "Free Ship", "5% OFF", "Try Again", "15% OFF"]}
                                onWin={handleWin}
                            />
                        ) : (
                            <div className="w-full">
                                {/* Generic Image/Text Popup */}
                                {content.image && (
                                    <img src={content.image} alt="offer" className="w-full h-48 object-cover rounded-lg mb-4" />
                                )}
                                <button
                                    onClick={handleClose}
                                    className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                >
                                    {content.cta || "Got it!"}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center py-8">
                        <Gift size={64} className="text-red-500 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">CONGRATS!</h2>
                        <p className="text-gray-600 mb-6">You've won a special discount.</p>

                        <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-xl p-4 w-full mb-6 relative group cursor-pointer"
                            onClick={() => {
                                navigator.clipboard.writeText(wonCoupon);
                                // could show copied toast here
                            }}
                        >
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Your Coupon Code</p>
                            <p className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
                                {wonCoupon}
                            </p>
                            <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to Copy
                            </span>
                        </div>

                        <button
                            onClick={handleClose}
                            className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-all w-full"
                        >
                            Start Shopping
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PopupManager;
