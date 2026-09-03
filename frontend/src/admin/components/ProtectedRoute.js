import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Add timestamp to prevent caching of the auth check
      axios
        .get(`${API_BASE_URL}/admin/profile?_t=${Date.now()}`, { withCredentials: true })
        .then((res) => {
          setAuthenticated(true);
        })
        .catch(() => {
          setAuthenticated(false);
          // If the check fails, we might want to ensure we aren't in a weird state
        })
        .finally(() => setLoading(false));
    };

    checkAuth();

    // Handle back/forward cache (BFCache)
    const handlePageShow = (event) => {
      if (event.persisted) {
        // Page was restored from cache, re-verify auth
        setLoading(true);
        checkAuth();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!authenticated) return <Navigate to="/admin" />; // redirect to login
  return children;
}
