import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useLocation from '../hooks/useLocation';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const NearbyShops = () => {
    const { lat, lng, loading: locLoading } = useLocation();
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchShops = async () => {
            try {
                let url = `${API_BASE_URL}/shops/explore`;
                if (lat && lng) {
                    console.log('🗺️ Fetching nearby shops with location:', { lat, lng });
                    url += `?lat=${lat}&lng=${lng}&radius=50`;
                } else {
                    console.log('📍 No location available, fetching fallback shops');
                }

                console.log('🔗 API URL:', url);
                const res = await axios.get(url);
                console.log('✅ API Response:', res.data);

                if (res.data.success) {
                    setShops(res.data.shops);
                    console.log(`📦 Found ${res.data.shops.length} shops`);
                }
            } catch (err) {
                console.error("❌ Failed to fetch nearby shops", err);
            } finally {
                setLoading(false);
            }
        };

        if (!locLoading) {
            fetchShops();
        }
    }, [lat, lng, locLoading]);

    // Show loading skeleton
    if (loading || locLoading) {
        return (
            <div className="my-8 px-2">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2"></div>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-shrink-0 w-64 h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (shops.length === 0) return null;

    return (
        <div className="my-8 px-2">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Discover Nearby Shops</h2>
                    <p className="text-sm text-gray-500 mt-1">Found {shops.length} amazing stores around you</p>
                </div>
                <button
                    onClick={() => navigate('/shops/')}
                    className="text-brand-orange font-semibold text-sm hover:underline flex items-center gap-1"
                >
                    View All
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar scroll-smooth min-h-[250px]">
                {shops.map((shop) => (
                    <div
                        key={shop.id || Math.random()}
                        onClick={() => navigate(`/shop/${shop.slug}/`)}
                        className="flex-shrink-0 w-64 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                    >
                        <div className="relative h-32 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                                {shop.logo_url ? (
                                    <img
                                        src={shop.logo_url.startsWith('http') ? shop.logo_url : `${(API_BASE_URL || '').replace('/api', '')}${shop.logo_url.startsWith('/') ? '' : '/'}${shop.logo_url}`}
                                        alt={shop.name}
                                        className="w-20 h-20 object-contain rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-500 bg-white p-2"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                            ) : (
                                <div className="w-20 h-20 bg-white rounded-xl shadow-lg flex items-center justify-center text-brand-orange text-2xl font-bold">
                                    {(shop.name || "S").charAt(0)}
                                </div>
                            )}

                            {shop.distance != null && (
                                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                    <svg className="w-3 h-3 text-brand-orange" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                    {Number(shop.distance).toFixed(1)} km
                                </div>
                            )}
                        </div>

                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 truncate group-hover:text-brand-orange transition-colors">
                                {shop.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs text-gray-500">{shop.city}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="text-xs text-gray-500">{shop.pincode}</span>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                                            <div className="w-full h-full bg-orange-200 animate-pulse"></div>
                                        </div>
                                    ))}
                                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-800 flex items-center justify-center text-[8px] text-white font-bold">
                                        +12
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider">Visit Store</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NearbyShops;
