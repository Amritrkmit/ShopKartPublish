import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const SitemapPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get otracker param if present
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const otracker = searchParams.get('otracker');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch JSON data from backend
                const response = await axios.get(`${API_BASE_URL}/sitemap/json`);
                setData(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching sitemap:", err);
                setError("Failed to load sitemap.");
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-red-500">
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { categories, subcategories, shops, brands } = data;



    // Helper to append tracking param
    const getTrackedUrl = (path) => {
        if (!otracker) return path;
        return `${path}?otracker=${otracker}`;
    };

    // Group subcategories by parent category for cleaner display
    const subcatsByCatId = subcategories.reduce((acc, sub) => {
        if (!acc[sub.category_id]) acc[sub.category_id] = [];
        acc[sub.category_id].push(sub);
        return acc;
    }, {});

    return (
        <div className="bg-gray-100 min-h-screen py-8">
            <div className="container mx-auto px-4 bg-white shadow-sm rounded-md p-6">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Sitemap</h1>

                <div className="space-y-8">
                    {/* Section: Categories & Subcategories */}
                    <section>
                        <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">Categories</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {categories.map(cat => (
                                <div key={cat.id} className="mb-4">
                                    <Link
                                        to={getTrackedUrl(`/category/${cat.slug}`)}
                                        className="font-medium text-blue-600 hover:underline block mb-2"
                                    >
                                        {cat.name}
                                    </Link>
                                    <ul className="text-sm text-gray-600 space-y-1 pl-2 border-l-2 border-gray-100">
                                        {subcatsByCatId[cat.id]?.map(sub => (
                                            <li key={sub.id}>
                                                <Link
                                                    to={getTrackedUrl(`/subcategory/${sub.slug}`)}
                                                    className="hover:text-blue-500 hover:underline"
                                                >
                                                    {sub.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section: Shops */}
                    {shops && shops.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">Shops</h2>
                            <div className="flex flex-wrap gap-2">
                                {shops.map(shop => (
                                    <Link
                                        key={shop.id}
                                        to={getTrackedUrl(`/shop/${shop.slug}`)}
                                        className="text-sm text-gray-600 hover:text-blue-600 hover:underline px-2 py-1 bg-gray-50 rounded"
                                    >
                                        {shop.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section: Brands (Optional, if many can be clutter) */}
                    {brands && brands.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">Popular Brands</h2>
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                                {brands.map(brand => (
                                    <span key={brand.id} className="hover:text-gray-800">
                                        {brand.name}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SitemapPage;
