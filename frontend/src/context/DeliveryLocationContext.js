import React, { createContext, useContext, useState, useEffect } from 'react';

const DeliveryLocationContext = createContext();

export const useDeliveryLocation = () => {
    const context = useContext(DeliveryLocationContext);
    if (!context) {
        throw new Error('useDeliveryLocation must be used within DeliveryLocationProvider');
    }
    return context;
};

export const DeliveryLocationProvider = ({ children }) => {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isLocationSet, setIsLocationSet] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedLocation = localStorage.getItem('deliveryLocation');
        if (savedLocation) {
            try {
                const location = JSON.parse(savedLocation);
                setSelectedLocation(location);
                setIsLocationSet(true);
            } catch (error) {
                console.error('Failed to parse saved location:', error);
                localStorage.removeItem('deliveryLocation');
            }
        }
    }, []);

    const setLocation = (location) => {
        setSelectedLocation(location);
        setIsLocationSet(true);
        localStorage.setItem('deliveryLocation', JSON.stringify(location));
    };

    const clearLocation = () => {
        setSelectedLocation(null);
        setIsLocationSet(false);
        localStorage.removeItem('deliveryLocation');
    };

    const value = {
        selectedLocation,
        isLocationSet,
        setLocation,
        clearLocation
    };

    return (
        <DeliveryLocationContext.Provider value={value}>
            {children}
        </DeliveryLocationContext.Provider>
    );
};
