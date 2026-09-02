import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useLocation from '../../hooks/useLocation';
import { MapPin, Store, Package, Search, Filter } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ShopsListingPage = () => {
    const { lat, lng, loading: locLoading } = useLocation();
    const [shops, setShops] = useState([]);
    const [filteredShops, setFilteredShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('distance'); // distance, name, newest
    const navigate = useNavigate();

    useEffect(() => {
        const fetchShops = async () => {
            try {
                let url = `${API_BASE_URL}/shops/explore`;
                if (lat && lng) {
                    console.log('🗺️ Fetching shops with location:', { lat, lng });
                    url += `?lat=${lat}&lng=${lng}&radius=500`; // Larger radius for listing page
                } else {
                    console.log('📍 Fetching all shops (fallback)');
                }

                const res = await axios.get(url);
                if (res.data.success) {
                    setShops(res.data.shops);
                    setFilteredShops(res.data.shops);
                }
            } catch (err) {
                console.error("❌ Failed to fetch shops", err);
            } finally {
                setLoading(false);
            }
        };

        if (!locLoading) {
            fetchShops();
        }
    }, [lat, lng, locLoading]);

    // Filter and sort
    useEffect(() => {
        let result = [...shops];

        // Search filter
        if (searchTerm) {
            result = result.filter(shop =>
                shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                shop.city.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        if (sortBy === 'distance' && lat && lng) {
            result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else if (sortBy === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        setFilteredShops(result);
    }, [shops, searchTerm, sortBy, lat, lng]);

    if (loading || locLoading) {
        return (
            <div className="min-h-screen bg-[#f1f3f6] pt-4 pb-8">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="h-12 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-lg p-4 h-48 animate-pulse">
                                <div className="h-20 w-20 bg-gray-200 rounded-lg mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f3f6] pt-4 pb-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Store className="text-brand-orange" size={32} />
                        Discover Shops
                    </h1>
                    <p className="text-gray-600">
                        {lat && lng
                            ? `Found ${filteredShops.length} shops ${shops.some(s => s.distance) ? 'near you' : 'available'}`
                            : `Browse ${filteredShops.length} amazing stores`
                        }
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search shops by name or city..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Filter size={18} className="text-gray-500" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none bg-white w-full md:w-auto"
                            >
                                {lat && lng && <option value="distance">Nearest First</option>}
                                <option value="name">Name (A-Z)</option>
                                <option value="newest">Newest First</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Shops Grid */}
                {filteredShops.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <Store className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No shops found</h3>
                        <p className="text-gray-500">
                            {searchTerm ? 'Try adjusting your search' : 'No shops available at the moment'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredShops.map((shop) => (
                            <div
                                key={shop.id}
                                onClick={() => navigate(`/shop/${shop.slug}`)}
                                className="bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100"
                            >
                                {/* Header with Logo */}
                                <div className="relative h-40 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-6">
                                    {shop.logo_url ? (
                                        <img
                                            src={shop.logo_url.startsWith('http') ? shop.logo_url : `${(API_BASE_URL || '').replace('/api', '')}${shop.logo_url.startsWith('/') ? '' : '/'}${shop.logo_url}`}
                                            alt={shop.name}
                                            className="max-h-24 max-w-full object-contain rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-500 bg-white p-3"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center text-brand-orange text-3xl font-bold">
                                            {shop.name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Distance Badge */}
                                    {shop.distance != null && (
                                        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                            <MapPin size={14} className="text-brand-orange" />
                                            {Number(shop.distance).toFixed(1)} km
                                        </div>
                                    )}

                                    {/* Official Badge */}
                                    <div className="absolute bottom-4 left-4 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                        Official Store
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-brand-orange transition-colors mb-2 line-clamp-1">
                                        {shop.name}
                                    </h3>

                                    {/* Location */}
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="line-clamp-1">{shop.city}, {shop.pincode}</span>
                                    </div>

                                    {/* Description */}
                                    {shop.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                                            {shop.description}
                                        </p>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Package size={16} className="text-brand-orange" />
                                            <span className="font-medium">View Products</span>
                                        </div>
                                        <svg className="w-5 h-5 text-brand-orange group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopsListingPage;
