import React from 'react';
import './Loader.css';

// Spinner Loader
export const Spinner = ({ size = 'md', color = '#dc3545' }) => {
    const sizes = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    return (
        <div
            className={`${sizes[size]} border-3 border-gray-200 border-t-[${color}] rounded-full animate-spin`}
            style={{ borderTopColor: color, borderWidth: '3px' }}
        />
    );
};

// Flipkart Bars Loader (Reusable)
export const FlipkartLoader = () => {
    return (
        <div className="loader-flipkart">
            <div className="loader-bar"></div>
            <div className="loader-bar"></div>
            <div className="loader-bar"></div>
            <div className="loader-bar"></div>
        </div>
    );
};

// Full Page Loader
export const PageLoader = ({ text = 'Loading...' }) => {
    return (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="loader-flipkart">
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                    <div className="loader-bar"></div>
                </div>
                <p className="text-sm text-gray-600 font-medium">{text}</p>
            </div>
        </div>
    );
};

// Skeleton Loader for Product Cards
export const ProductSkeleton = () => {
    return (
        <div className="p-4 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
    );
};

// Skeleton Grid for Product Listing
export const ProductGridSkeleton = ({ count = 8 }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(count)].map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
};

// Inline Loader (for buttons, etc.)
export const InlineLoader = ({ size = 'sm' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <div
            className={`${sizes[size]} border-2 border-white/30 border-t-white rounded-full animate-spin`}
        />
    );
};

// Content Loader with Progress Bar
export const ContentLoader = ({ text = 'Loading products...' }) => {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#dc3545] rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="text-sm text-gray-500">{text}</p>
        </div>
    );
};

// Dots Loader
export const DotsLoader = () => {
    return (
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-[#dc3545] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#dc3545] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#dc3545] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    );
};

export default ContentLoader;
