import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const token = localStorage.getItem("userToken");
            const saved = localStorage.getItem("user");
            return (token && saved) ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const [admin, setAdmin] = useState(null);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        setLoading(true);
        // Standardize base URL
        const BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
        const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

        const authPromises = [];

        // 1. Fetch Customer Profile
        const storedToken = localStorage.getItem("userToken");

        if (storedToken) {
            authPromises.push(
                axios.get(`${BASE_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${storedToken}` }
                })
                    .then(res => {
                        setUser(res.data);
                        localStorage.setItem("user", JSON.stringify(res.data));
                    })
                    .catch((err) => {
                        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                            localStorage.removeItem("user");
                            localStorage.removeItem("userToken");
                            setUser(null);
                        }
                    })
            );
        } else {
            // No token present — clear user to avoid ghost session
            localStorage.removeItem("user");
            setUser(null);
        }

        // 2. Fetch Seller Profile (Keep hybrid or move to cookie? Prompt implied whole project but seller auth is separate system maybe?
        // For safety I will keep seller as is but add withCredentials just in case backend supports it,
        // but user asked for "secure Authentication System" primarily focusing on the login flow shown.)
        // I will focus on user auth as requested.
        const sellerToken = localStorage.getItem("sellerToken");
        if (sellerToken) {
            authPromises.push(
                axios.get(`${API_BASE_URL}/seller/profile`, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                })
                    .then(res => { setSeller(res.data); })
                    .catch((err) => {
                        if (err.response?.status === 401 || err.response?.status === 403) {
                            localStorage.removeItem("sellerToken");
                            localStorage.removeItem("seller");
                            setSeller(null);
                        } else if (err.response?.status === 404) {
                            console.warn("Seller has no shop record. Keeping session for onboarding.");
                            setSeller({ id: 'pending', status: 'ONBOARDING' });
                        } else {
                            setSeller(null);
                        }
                    })
            );
        }

        // 3. Admin Auth
        const adminToken = localStorage.getItem("adminToken");
        const adminUser = localStorage.getItem("adminUser");
        if (adminUser || adminToken) {
            const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
            authPromises.push(
                axios.get(`${BASE_URL}/admin/profile`, { headers, withCredentials: true })
                    .then(res => {
                        setAdmin(res.data);
                        localStorage.setItem("adminUser", JSON.stringify(res.data));
                    })
                    .catch(() => {
                        localStorage.removeItem("adminUser");
                        localStorage.removeItem("adminToken");
                        setAdmin(null);
                    })
            );
        }

        await Promise.allSettled(authPromises);
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const loginUser = (data, tokenParam) => {
        // Handles both loginUser(user, token) and loginUser({ user, token })
        let userData = data;
        let token = tokenParam;

        if (data && typeof data === 'object') {
            if (data.user) {
                userData = data.user;
                token = token || data.token;
            } else if (data.token) {
                token = token || data.token;
            }
        }

        // Strict Isolation
        localStorage.removeItem("sellerToken");
        localStorage.removeItem("seller");
        localStorage.removeItem("adminUser");
        setSeller(null);
        setAdmin(null);

        // Update State & UI Storage
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData));
        }
        if (token) {
            localStorage.setItem("userToken", token);
        }
        setUser(userData);
    };

    const loginSeller = (sellerData, token) => {
        // Strict Isolation: Clear other roles on seller login
        axios.post(`${process.env.REACT_APP_API_BASE_URL}/users/logout`, {}, { withCredentials: true }).catch(() => { });

        localStorage.removeItem("user");
        localStorage.removeItem("userToken");
        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminToken");
        setUser(null);
        setAdmin(null);

        if (token) {
            localStorage.setItem("sellerToken", token);
        }
        localStorage.setItem("seller", JSON.stringify(sellerData));
        setSeller(sellerData);
    };

    const loginAdmin = (adminData, tokenParam) => {
        let admin = adminData;
        let token = tokenParam;
        if (adminData && adminData.token) {
            token = token || adminData.token;
            admin = adminData.user || adminData;
        }

        // Call logout endpoint for user just in case
        axios.post(`${process.env.REACT_APP_API_BASE_URL}/users/logout`, {}, { withCredentials: true }).catch(() => { });

        localStorage.removeItem("user");
        localStorage.removeItem("userToken");
        localStorage.removeItem("sellerToken");
        localStorage.removeItem("seller");
        setUser(null);
        setSeller(null);

        localStorage.setItem("adminUser", JSON.stringify(admin));
        if (token) {
            localStorage.setItem("adminToken", token);
        }
        setAdmin(admin);
    };

    const logout = (type = 'user') => {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

        if (type === 'user') {
            localStorage.removeItem("user");
            localStorage.removeItem("userToken");
            setUser(null);
            // Call backend to clear cookie
            axios.post(`${API_BASE_URL}/users/logout`, {}, { withCredentials: true });

        } else if (type === 'seller') {
            localStorage.removeItem("sellerToken");
            localStorage.removeItem("seller");
            setSeller(null);
            axios.post(`${API_BASE_URL}/seller/logout`, {}, { withCredentials: true }).catch(() => { });
        } else if (type === 'admin') {
            localStorage.removeItem("adminUser");
            localStorage.removeItem("adminToken");
            setAdmin(null);
            axios.post(`${API_BASE_URL}/admin/logout`, {}, { withCredentials: true }).catch(() => { });
        } else if (type === 'all') {
            localStorage.removeItem("user");
            localStorage.removeItem("sellerToken");
            localStorage.removeItem("seller");
            localStorage.removeItem("adminUser");
            setUser(null);
            setSeller(null);
            setAdmin(null);
            axios.post(`${API_BASE_URL}/admin/logout`, {}, { withCredentials: true });
            axios.post(`${API_BASE_URL}/users/logout`, {}, { withCredentials: true });
        }
    };

    return (
        <AuthContext.Provider value={{
            user, admin, seller, loading,
            loginUser, loginAdmin, loginSeller, logout,
            logoutAll: () => logout('all'),
            refreshAuth: checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
