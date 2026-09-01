import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../utils/toast";
import { useAuth } from "./AuthContext";

export const WishlistContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const WishlistProvider = ({ children }) => {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth(); // Use user object for auth check

    const fetchWishlist = useCallback(async () => {
        if (!user) {
            setWishlist([]); // Clear if no user
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/users/wishlist`, {
                withCredentials: true,
            });
            const items = res.data.wishlist || res.data.data || res.data;
            const wishlistedIds = items.map((item) => item.product_id || item.id);
            setWishlist(wishlistedIds);

            // Sync count for legacy header display if needed
            localStorage.setItem("wishlistCount", wishlistedIds.length);
            window.dispatchEvent(new Event("wishlistUpdate"));
        } catch (err) {
            console.error("Error fetching wishlist:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        setLoading(true);
        fetchWishlist();
    }, [fetchWishlist]);

    const addToWishlist = async (productId) => {
        if (!user) return toastError("Please login to add to wishlist");
        try {
            await axios.post(
                `${API_BASE_URL}/users/wishlist`,
                { product_id: productId },
                { withCredentials: true }
            );
            setWishlist((prev) => {
                const updated = [...new Set([...prev, productId])];
                localStorage.setItem("wishlistCount", updated.length);
                window.dispatchEvent(new Event("wishlistUpdate"));
                return updated;
            });
            toastSuccess("Added to wishlist ❤️");
        } catch (err) {
            toastError(err.response?.data?.message || "Failed to add to wishlist");
        }
    };

    const removeFromWishlist = async (productId) => {
        if (!user) return toastError("Please login to remove from wishlist");
        try {
            await axios.delete(
                `${API_BASE_URL}/users/wishlist/${productId}`,
                { withCredentials: true }
            );
            setWishlist((prev) => {
                const updated = prev.filter((id) => id !== productId);
                localStorage.setItem("wishlistCount", updated.length);
                window.dispatchEvent(new Event("wishlistUpdate"));
                return updated;
            });
            toastSuccess("Removed from wishlist 💔");
        } catch (err) {
            toastError(err.response?.data?.message || "Failed to remove from wishlist");
        }
    };

    return (
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, loading, fetchWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
};
