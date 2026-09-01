import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PublicRoute: For pages like Login/Register.
 * Prevents redundant logins for the same role.
 */
export const PublicRoute = ({ children, restrictedTo = 'user' }) => {
    const { user, admin, seller, loading } = useAuth();

    if (loading) return null;

    // Only redirect if already logged in AS THE TARGET ROLE
    if (restrictedTo === 'admin' && admin) {
        return <Navigate to="/admin/dashboard/" replace />;
    }
    if (restrictedTo === 'seller' && seller) {
        return <Navigate to="/seller/dashboard/" replace />;
    }
    if (restrictedTo === 'user' && user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

/**
 * RoleRoute: For protected pages.
 * Ensures only the specific role can access the route.
 */
export const RoleRoute = ({ children, role = 'user' }) => {
    const { user, admin, seller, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    if (role === 'admin') {
        if (!admin) return <Navigate to="/admin/login/" state={{ from: location }} replace />;
        return children;
    }

    if (role === 'seller') {
        if (!seller) return <Navigate to="/seller/login/" state={{ from: location }} replace />;
        return children;
    }

    if (role === 'user') {
        if (!user) return <Navigate to="/login/" state={{ from: location }} replace />;
        return children;
    }

    return children;
};
