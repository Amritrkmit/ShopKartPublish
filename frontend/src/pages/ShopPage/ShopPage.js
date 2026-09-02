import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toastError } from "../../utils/toast";
import useWishlist from "../../hooks/useWishlist";
import { MapPin, Share2, Zap, IndianRupee } from "lucide-react";
import { parsePrice } from "../../utils/format";
import { generateProductUrl } from "../../utils/productUrl";
import MobileFilterHeader from "../../components/MobileFilterHeader";
import MobileSortDrawer from "../../components/MobileSortDrawer";
import MobileFilterDrawer from "../../components/MobileFilterDrawer";

// Helper for "Functionality" Demo where DB might lack columns
// (Copied from CategoryPage to ensure identical card look)
const OFFERS = ['Special Price', 'Buy More, Save More', 'No Cost EMI', 'Partner Offer'];

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ShopPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

    const [shop, setShop] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);

    // Filters
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState([]);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(100000);
    const [sortBy, setSortBy] = useState("popularity");

    // Mobile Drawers
    const [isSortOpen, setSortOpen] = useState(false);
    const [isFilterOpen, setFilterOpen] = useState(false);
    const [activeFilterTab, setActiveFilterTab] = useState('price');

    // Dynamic Options
    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableSubcategories, setAvailableSubcategories] = useState([]);

    // --- MOCK ENRICHMENT (Matching CategoryPage) ---
    const enrichProduct = React.useCallback((p) => {
        const randomSeed = p.id;
        const mockRating = (3.5 + (randomSeed % 15) / 10).toFixed(1);
        const mockDiscount = (randomSeed * 11) % 70;
        const mockOffers = OFFERS.filter((_, i) => (randomSeed + i) % 3 === 0);
        const hasGST = randomSeed % 2 === 0;

        return {
            ...p,
            rating: parseFloat(p.rating || mockRating),
            ratingCount: (randomSeed * 123) % 5000 + 50,
            discount: p.discount || mockDiscount,
            old_price: p.old_price || Math.round(p.price * (100 / (100 - mockDiscount))),
            offers: mockOffers,
            gstAvailable: hasGST
        };
    }, []);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/shops/${slug}`);
                if (res.data.success) {
                    setShop(res.data.shop);
                    const enriched = res.data.products.map(enrichProduct);
                    setAllProducts(enriched);
                    setProducts(enriched);
                }
            } catch (err) {
                console.error(err);
                if (err.response && err.response.status === 404) {
                    toastError("Shop not found");
                    navigate("/");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchShopData();
    }, [slug, navigate, enrichProduct]);

    // --- EXTRACT FILTERS ---
    useEffect(() => {
        if (allProducts.length > 0) {
            const cats = [...new Set(allProducts.map(p => p.category_name).filter(Boolean))];
            const subs = [...new Set(allProducts.map(p => p.subcategory_name).filter(Boolean))];
            setAvailableCategories(cats);
            setAvailableSubcategories(subs);
        }
    }, [allProducts]);

    // --- APPLY FILTERS ---
    useEffect(() => {
        setFilterLoading(true);
        const timeout = setTimeout(() => {
            let result = [...allProducts];

            // 1. Categories
            if (selectedCategories.length > 0) {
                result = result.filter(p => selectedCategories.includes(p.category_name));
            }
            // 2. Subcategories
            if (selectedSubcategories.length > 0) {
                result = result.filter(p => selectedSubcategories.includes(p.subcategory_name));
            }
            // 3. Price
            result = result.filter(p => {
                const price = Number(String(p.sale_price || p.price).replace(/,/g, ""));
                return price >= minPrice && price <= maxPrice;
            });

            // 4. Sort
            if (sortBy === 'price -- low to high') {
                result.sort((a, b) => {
                    const priceA = Number(String(a.sale_price || a.price).replace(/,/g, ""));
                    const priceB = Number(String(b.sale_price || b.price).replace(/,/g, ""));
                    return priceA - priceB;
                });
            } else if (sortBy === 'price -- high to low') {
                result.sort((a, b) => {
                    const priceA = Number(String(a.sale_price || a.price).replace(/,/g, ""));
                    const priceB = Number(String(b.sale_price || b.price).replace(/,/g, ""));
                    return priceB - priceA;
                });
            } else if (sortBy === 'newest first') {
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else {
                result.sort((a, b) => b.ratingCount - a.ratingCount); // Popularity
            }

            setProducts(result);
            setFilterLoading(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [allProducts, selectedCategories, selectedSubcategories, minPrice, maxPrice, sortBy]);

    const toggleWishlist = (e, productId) => {
        e.stopPropagation();
        if (wishlist.includes(productId)) removeFromWishlist(productId);
        else addToWishlist(productId);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f1f3f6]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2874f0]"></div>
        </div>
    );

    if (!shop) return null;

    return (
        <div className="bg-[#f1f3f6] min-h-screen pt-4 pb-4">
            <div className="mx-auto px-0 md:px-2 flex flex-col md:flex-row gap-4">
                {/* Mobile Filter Header */}
                <MobileFilterHeader
                    onSortClick={() => setSortOpen(true)}
                    onFilterClick={() => setFilterOpen(true)}
                    activeSort={sortBy}
                    quickFilters={[
                        {
                            label: '₹20000 - ₹30000',
                            isActive: minPrice === 20000 && maxPrice === 30000,
                            icon: <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center"><IndianRupee size={10} className="text-green-700" /></div>,
                            onClick: () => {
                                if (minPrice === 20000 && maxPrice === 30000) {
                                    setMinPrice(0);
                                    setMaxPrice(100000);
                                } else {
                                    setMinPrice(20000);
                                    setMaxPrice(30000);
                                }
                            }
                        },
                        {
                            label: 'New Launches',
                            isActive: sortBy === 'newest first',
                            icon: <Zap size={14} className="text-blue-500" />,
                            onClick: () => {
                                setSortBy(prev => prev === 'newest first' ? 'popularity' : 'newest first');
                            }
                        }
                    ]}
                />

                {/* Mobile Sort Drawer */}
                <MobileSortDrawer
                    isOpen={isSortOpen}
                    onClose={() => setSortOpen(false)}
                    activeSort={sortBy}
                    onSortChange={(val) => {
                        setSortBy(val);
                    }}
                />

                {/* Mobile Filter Drawer */}
                <MobileFilterDrawer
                    isOpen={isFilterOpen}
                    onClose={() => setFilterOpen(false)}
                    onApply={() => { }}
                    onClearAll={() => {
                        setSelectedCategories([]);
                        setSelectedSubcategories([]);
                        setMinPrice(0);
                        setMaxPrice(100000);
                    }}
                    activeTab={activeFilterTab}
                    setActiveTab={setActiveFilterTab}
                    tabs={[
                        { id: 'price', label: 'Price' },
                        { id: 'category', label: 'Category' },
                        { id: 'subcategory', label: 'Subcategory' },
                    ]}
                    renderContent={() => (
                        <div className="space-y-4">
                            {activeFilterTab === 'price' && (
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-800">Select Price Range</h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs text-gray-500 font-medium uppercase">Min Price</label>
                                            <select
                                                className="w-full border p-3 rounded-md bg-gray-50 text-[14px]"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(Number(e.target.value))}
                                            >
                                                <option value="0">Min</option>
                                                {[500, 1000, 5000, 10000, 20000, 50000].map(v => <option key={v} value={v}>₹{v}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs text-gray-500 font-medium uppercase">Max Price</label>
                                            <select
                                                className="w-full border p-3 rounded-md bg-gray-50 text-[14px]"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(Number(e.target.value))}
                                            >
                                                {[5000, 10000, 30000, 50000, 100000].map(v => <option key={v} value={v}>₹{v}{v === 100000 ? '+' : ''}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeFilterTab === 'category' && (
                                <div className="space-y-1">
                                    {availableCategories.map((cat) => (
                                        <label key={cat} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                                                className="w-5 h-5 text-brand-orange border-gray-300 rounded focus:ring-0"
                                            />
                                            <span className={`text-[15px] ${selectedCategories.includes(cat) ? 'text-brand-orange font-medium' : 'text-gray-700'}`}>
                                                {cat}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {activeFilterTab === 'subcategory' && (
                                <div className="space-y-1">
                                    {availableSubcategories.map((sub) => (
                                        <label key={sub} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubcategories.includes(sub)}
                                                onChange={() => setSelectedSubcategories(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])}
                                                className="w-5 h-5 text-brand-orange border-gray-300 rounded focus:ring-0"
                                            />
                                            <span className={`text-[15px] ${selectedSubcategories.includes(sub) ? 'text-brand-orange font-medium' : 'text-gray-700'}`}>
                                                {sub}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                />

                {/* --- LEFT SIDEBAR (Exactly matching CategoryPage) --- */}
                <div className="w-[280px] hidden md:block bg-white shadow-sm rounded-sm self-start sticky top-[70px] overflow-y-auto max-h-[calc(100vh-80px)] hide-scrollbar">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-bold text-gray-800">Filters</h3>
                        {(selectedCategories.length > 0 || selectedSubcategories.length > 0 || minPrice > 0) && (
                            <button onClick={() => { setSelectedCategories([]); setSelectedSubcategories([]); setMinPrice(0); }} className="text-xs font-bold text-[#dc3545] uppercase mt-1 float-right">Clear All</button>
                        )}
                    </div>

                    {/* Price Filter */}
                    <div className="p-4 border-b">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Price</h4>
                        <div className="relative h-6 mb-4">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2">
                                <div className="absolute h-full bg-[#dc3545] rounded-full" style={{ left: `${(minPrice / 100000) * 100}%`, width: `${((maxPrice - minPrice) / 100000) * 100}%` }} />
                            </div>
                            <input type="range" min="0" max="100000" step="1000" value={minPrice} onChange={(e) => { const val = Number(e.target.value); if (val < maxPrice) setMinPrice(val); }} className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer" style={{ zIndex: minPrice > maxPrice - 5000 ? 5 : 3 }} />
                            <input type="range" min="0" max="100000" step="1000" value={maxPrice} onChange={(e) => { const val = Number(e.target.value); if (val > minPrice) setMaxPrice(val); }} className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer" style={{ zIndex: 4 }} />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <select className="flex-1 border border-gray-200 p-2 rounded text-sm outline-none bg-white" value={minPrice} onChange={e => setMinPrice(Number(e.target.value))}>
                                <option value="0">Min</option>
                                <option value="500">₹500</option>
                                <option value="1000">₹1000</option>
                                <option value="5000">₹5000</option>
                                <option value="10000">₹10000</option>
                            </select>
                            <span className="text-gray-400 text-xs">to</span>
                            <select className="flex-1 border border-gray-200 p-2 rounded text-sm outline-none bg-white" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}>
                                <option value="5000">₹5000</option>
                                <option value="10000">₹10000</option>
                                <option value="20000">₹20000</option>
                                <option value="50000">₹50000</option>
                                <option value="100000">₹1L+</option>
                            </select>
                        </div>
                    </div>

                    {/* Categories Filter */}
                    <div className="p-4 border-b">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Categories</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {availableCategories.map(cat => (
                                <label key={cat} className="flex items-center gap-2 cursor-pointer mb-2 group">
                                    <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500 cursor-pointer" />
                                    <span className={`text-sm transition-colors ${selectedCategories.includes(cat) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Subcategories Filter */}
                    {availableSubcategories.length > 0 && (
                        <div className="p-4 border-b">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Subcategories</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                {availableSubcategories.map(sub => (
                                    <label key={sub} className="flex items-center gap-2 cursor-pointer mb-2 group">
                                        <input type="checkbox" checked={selectedSubcategories.includes(sub)} onChange={() => setSelectedSubcategories(prev => prev.includes(sub) ? prev.filter(c => c !== sub) : [...prev, sub])} className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500 cursor-pointer" />
                                        <span className={`text-sm transition-colors ${selectedSubcategories.includes(sub) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{sub}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- RIGHT CONTENT --- */}
                <div className="flex-1">

                    {/* Header / Shop Info Block */}
                    <div className="bg-white shadow-sm rounded-sm p-4 mb-2">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4 border-b pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded shadow-sm border border-gray-100 flex-shrink-0 bg-white p-1">
                                    {shop.logo_url ? (
                                        <img src={shop.logo_url.startsWith('http') ? shop.logo_url : `${(API_BASE_URL || '').replace('/api', '')}${shop.logo_url.startsWith('/') ? '' : '/'}${shop.logo_url}`} onError={(e) => { e.target.style.display = 'none' }} alt={shop.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-xl">{shop.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        {shop.name}
                                        <span className="px-2 py-0.5 bg-[#2874f0] text-white text-[10px] font-bold rounded-sm uppercase tracking-wide">Official Store</span>
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <MapPin size={14} />
                                        <span>{shop.city}, {shop.pincode}</span>
                                        <span className="mx-1">•</span>
                                        <span className="text-green-600 font-bold">{allProducts.length} Products</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{shop.description}</p>
                                </div>
                            </div>
                            {/* Actions */}
                            <button className="flex items-center gap-2 text-sm font-bold text-[#2874f0] hover:bg-blue-50 px-3 py-1.5 rounded transition bg-transparent" onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                // Simple feedback could be added here
                            }}>
                                <Share2 size={16} />
                                Share
                            </button>
                        </div>

                        {/* Sort Bar */}
                        <div className="hidden md:flex gap-4 text-sm font-medium text-gray-700">
                            <span className="font-bold">Sort By</span>
                            {['Popularity', 'Price -- Low to High', 'Price -- High to Low', 'Newest First'].map(s => (
                                <button
                                    key={s}
                                    className={`pb-1 border-b-2 transition ${sortBy === s.toLowerCase() ? 'text-[#dc3545] border-[#dc3545]' : 'border-transparent hover:text-[#dc3545]'}`}
                                    onClick={() => setSortBy(s.toLowerCase())}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid - Exactly Matching Category Page */}
                    <div className="bg-white shadow-sm rounded-sm min-h-[400px]">
                        {(loading || filterLoading) ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-[#dc3545] rounded-full animate-spin"></div>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">{loading ? 'Loading store...' : 'Updating...'}</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center">
                                <div className="text-gray-400 text-5xl mb-4">📦</div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">No products found</h3>
                                <button onClick={() => { setSelectedCategories([]); setSelectedSubcategories([]); setMinPrice(0); }} className="px-4 py-2 bg-[#2874f0] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            // EXACT GRID CLASSES from CategoryPage.js
                            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divider-gray-200 border-b border-gray-200 sm:divide-y-0 sm:divide-x sm:gap-0">
                                {products.map((product) => {
                                    const isWishlisted = wishlist.includes(product.id);
                                    return (
                                        <div key={product.id} className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer group flex flex-col relative" onClick={() => navigate(generateProductUrl(product))}>
                                            {/* Wishlist Icon */}
                                            <button onClick={(e) => toggleWishlist(e, product.id)} className="absolute top-2 right-2 z-10">
                                                <div className={`w-8 h-8 md:w-9 md:h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center border border-gray-100 transition-all hover:scale-110 ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 md:h-5 md:w-5 ${isWishlisted ? "fill-current" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </button>

                                            <div className="h-48 w-full flex items-center justify-center p-2 mb-4 relative">
                                                <img src={product.image ? `${API_BASE_URL.replace('/api', '')}${product.image}` : "https://placehold.co/200"} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                                            </div>

                                            <div className="flex-1 flex flex-col">
                                                <h3 className="text-sm font-medium text-gray-800 hover:text-[#dc3545] line-clamp-2 mb-1">{product.name}</h3>

                                                {/* Rating Badge */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        {product.rating} ★
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-medium">({product.ratingCount})</span>
                                                    {product.gstAvailable && <span className="text-[10px] text-gray-400 border border-gray-300 px-1 rounded">GST</span>}
                                                </div>

                                                <div className="mt-auto pt-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <span className="text-base sm:text-lg font-bold text-gray-900">{parsePrice(product.sale_price || product.price).toLocaleString("en-IN", { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                        {(product.discount > 0 || (product.sale_price && product.sale_price < product.price)) && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[12px] text-gray-400 !line-through">{parsePrice(product.price).toLocaleString("en-IN", { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                                <span className="text-[12px] text-green-600 font-bold whitespace-nowrap">
                                                                    {Math.round(((parsePrice(product.price) - parsePrice(product.sale_price || product.price)) / parsePrice(product.price)) * 100)}% off
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="text-[11px] text-black font-medium">Free delivery</div>
                                                        {product.offers && product.offers.length > 0 && (
                                                            <div className="text-[10px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                                                {product.offers[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopPage;
