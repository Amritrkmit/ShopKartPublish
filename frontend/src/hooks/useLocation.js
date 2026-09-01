import { useState, useEffect } from 'react';

const useLocation = () => {
    const [location, setLocation] = useState({
        lat: null,
        lng: null,
        city: null,
        pincode: null,
        error: null,
        loading: true
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: 'Geolocation not supported', loading: false }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    city: null, // Could use reverse geocoding here if needed
                    pincode: null,
                    error: null,
                    loading: false
                });
            },
            (error) => {
                if (error.code === 1) {
                    // Permission denied - handle gracefully without console error
                    setLocation(prev => ({ ...prev, error: "Location permission denied", loading: false }));
                } else {
                    console.error("Geolocation error:", error);
                    setLocation(prev => ({ ...prev, error: error.message, loading: false }));
                }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }, []);

    return location;
};

export default useLocation;
