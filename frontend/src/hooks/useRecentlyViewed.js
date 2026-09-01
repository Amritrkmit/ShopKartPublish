import { useState, useEffect, useCallback } from 'react';

const RECENTLY_VIEWED_KEY = 'recently_viewed_products';
const MAX_ITEMS = 15;

const useRecentlyViewed = () => {
    const [recentlyViewedIds, setRecentlyViewedIds] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
        if (stored) {
            try {
                setRecentlyViewedIds(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse recently viewed IDs", e);
            }
        }
    }, []);

    const addRecentlyViewed = useCallback((productId) => {
        if (!productId) return;

        setRecentlyViewedIds((prev) => {
            // Remove if already exists to move it to the front
            const filtered = prev.filter(id => id !== productId);
            const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
            localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearRecentlyViewed = useCallback(() => {
        localStorage.removeItem(RECENTLY_VIEWED_KEY);
        setRecentlyViewedIds([]);
    }, []);

    return { recentlyViewedIds, addRecentlyViewed, clearRecentlyViewed };
};

export default useRecentlyViewed;
