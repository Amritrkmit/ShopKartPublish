import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { X, Search, Plus, ChevronRight, ShoppingCart, ChevronDown } from 'lucide-react';
import useCart from '../../hooks/useCart';
import { useCompare } from '../../context/CompareContext';
import { toastSuccess } from '../../utils/toast';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const Compare = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const { addToCart } = useCart();
    const { compareList, toggleCompare, setCompareList } = useCompare();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [brands, setBrands] = useState([]);
    const [slotSelections, setSlotSelections] = useState({}); // { slotIdx: { brandId, productId } }
    const [productsForSlots, setProductsForSlots] = useState({}); // { slotIdx: [products] }

    const idsStr = searchParams.get('ids') || '';

    // Sync context with URL on mount and when URL changes
    useEffect(() => {
        const urlIds = idsStr ? idsStr.split(',') : [];
        if (urlIds.length > 0 && JSON.stringify(urlIds) !== JSON.stringify(compareList)) {
            setCompareList(urlIds);
            localStorage.setItem('compare_list', JSON.stringify(urlIds));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // Sync URL when context changes (but not from URL changes)
    useEffect(() => {
        const urlIds = idsStr ? idsStr.split(',') : [];
        const urlIdsStr = JSON.stringify(urlIds.sort());
        const compareListStr = JSON.stringify([...compareList].sort());

        if (urlIdsStr !== compareListStr) {
            if (compareList.length > 0) {
                setSearchParams({ ids: compareList.join(',') }, { replace: true });
            } else {
                setSearchParams({}, { replace: true });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [compareList]);

    const fetchProducts = useCallback(async () => {
        const ids = idsStr ? idsStr.split(',') : [];
        if (ids.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products?ids=${idsStr}`);
            // Maintain order of IDs in the URL
            const fetchedProducts = res.data.products || [];
            const sortedProducts = ids.map(id => fetchedProducts.find(p => String(p.id) === String(id))).filter(Boolean);
            setProducts(sortedProducts);
        } catch (err) {
            console.error("Failed to fetch products for comparison", err);
        } finally {
            setLoading(false);
        }
    }, [idsStr]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/brands`);
                setBrands(res.data || []);
            } catch (err) {
                console.error("Failed to fetch brands", err);
            }
        };
        fetchBrands();
    }, []);

    const fetchProductsByBrand = async (brandId, slotIdx) => {
        if (!brandId) return;
        try {
            const brand = brands.find(b => String(b.id) === String(brandId));
            const res = await axios.get(`${API_BASE_URL}/api/products?brand=${encodeURIComponent(brand.name)}`);
            setProductsForSlots(prev => ({ ...prev, [slotIdx]: res.data.products || [] }));
        } catch (err) {
            console.error("Failed to fetch products for brand", err);
        }
    };

    const handleBrandSelect = (brandId, slotIdx) => {
        setSlotSelections(prev => ({
            ...prev,
            [slotIdx]: { ...prev[slotIdx], brandId, productId: '' }
        }));
        fetchProductsByBrand(brandId, slotIdx);
    };

    const handleProductSelect = (productId, slotIdx) => {
        if (!productId) return;
        addProduct(productId);
        // Reset slot
        setSlotSelections(prev => ({
            ...prev,
            [slotIdx]: { brandId: '', productId: '' }
        }));
    };

    const handleSearch = async (val) => {
        setSearchTerm(val);
        if (val.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products?search=${val}&limit=5`);
            setSearchResults(res.data.products || []);
        } catch (err) {
            console.error(err);
        }
    };

    const addProduct = (productId) => {
        toggleCompare(String(productId));
        setSearchTerm("");
        setSearchResults([]);
    };

    const removeProduct = (productId) => {
        toggleCompare(String(productId));
    };

    // Extract all unique specification keys across all products
    const allSpecCategories = Array.from(new Set(products.flatMap(p => {
        const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications || '{}') : (p.specifications || {});
        return Object.keys(specs);
    })));

    const getSpecValue = (product, category) => {
        const specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications || '{}') : (product.specifications || {});
        return specs[category] || '-';
    };

    if (loading && products.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Breadcrumb */}
            <div className="bg-white border-b py-3 px-4">
                <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-gray-500">
                    <Link to="/" className="hover:text-blue-600">Home</Link>
                    <ChevronRight size={14} />
                    <span className="font-medium text-gray-900">Compare Products</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                    <div className="p-6 border-b">
                        <h1 className="text-2xl font-bold text-gray-900">Compare Products</h1>
                        <p className="text-sm text-gray-500 mt-1">{products.length} product(s) being compared</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr>
                                    <th className="p-6 border-b border-r bg-gray-50 w-64 align-top">
                                        <div className="relative">
                                            <div className="flex items-center gap-2 p-2 bg-white border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                                                <Search size={18} className="text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Add product to compare"
                                                    className="w-full outline-none text-sm"
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                />
                                            </div>
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-xl z-50 overflow-hidden">
                                                    {searchResults.map(p => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => addProduct(p.id)}
                                                            className="p-3 hover:bg-gray-50 flex items-center gap-3 cursor-pointer transition-colors border-b last:border-0"
                                                        >
                                                            <img src={`${API_BASE_URL}${p.image}`} alt={p.name} className="w-10 h-10 object-contain" />
                                                            <div>
                                                                <p className="text-sm font-semibold truncate w-40">{p.name}</p>
                                                                <p className="text-xs text-blue-600 font-bold">₹{p.price}</p>
                                                            </div>
                                                            <Plus size={16} className="text-gray-400 ml-auto" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                    {products.map(product => (
                                        <th key={product.id} className="p-6 border-b border-r min-w-[250px] align-top relative group">
                                            <button
                                                onClick={() => removeProduct(product.id)}
                                                className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove from comparison"
                                            >
                                                <X size={16} />
                                            </button>
                                            <div className="flex flex-col items-center text-center">
                                                <img
                                                    src={`${API_BASE_URL}${product.image}`}
                                                    alt={product.name}
                                                    className="h-32 object-contain mb-4 transform hover:scale-105 transition-transform duration-300"
                                                />
                                                <Link to={`/${product.slug}/?ids=${product.id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 line-clamp-2 mb-2 h-10 leading-tight">
                                                    {product.name}
                                                </Link>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-lg font-black text-gray-900">₹{product.sale_price || product.price}</span>
                                                    {product.sale_price && (
                                                        <span className="text-xs text-gray-400 line-through">₹{product.price}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        addToCart(product, 1);
                                                        toastSuccess("Added to cart");
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-2 bg-[#fb641b] text-white text-xs font-bold uppercase rounded-sm hover:bg-[#ff5500] transition-colors shadow-sm"
                                                >
                                                    <ShoppingCart size={14} /> Add to Cart
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                    {/* Placeholder for adding more if < 4 */}
                                    {products.length < 4 && Array.from({ length: 4 - products.length }).map((_, i) => {
                                        const slotIdx = products.length + i;
                                        const selection = slotSelections[slotIdx] || { brandId: '', productId: '' };
                                        const slotProducts = productsForSlots[slotIdx] || [];

                                        return (
                                            <th key={`empty-${i}`} className="p-6 border-b border-r min-w-[250px] align-top bg-white">
                                                <div className="flex flex-col gap-4">
                                                    <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Add a product</h3>

                                                    {/* Brand Dropdown */}
                                                    <div className="relative">
                                                        <select
                                                            className="w-full appearance-none bg-white border-b-2 border-gray-200 py-2 pr-8 text-sm focus:border-blue-600 outline-none transition-colors cursor-pointer"
                                                            value={selection.brandId}
                                                            onChange={(e) => handleBrandSelect(e.target.value, slotIdx)}
                                                        >
                                                            <option value="">Choose Brand</option>
                                                            {brands.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    </div>

                                                    {/* Product Dropdown */}
                                                    <div className="relative">
                                                        <select
                                                            className={`w-full appearance-none bg-white border-b-2 py-2 pr-8 text-sm outline-none transition-colors cursor-pointer ${selection.brandId ? 'border-gray-200 focus:border-blue-600' : 'border-gray-100 text-gray-400 opacity-50 cursor-not-allowed'}`}
                                                            disabled={!selection.brandId}
                                                            value={selection.productId}
                                                            onChange={(e) => handleProductSelect(e.target.value, slotIdx)}
                                                        >
                                                            <option value="">Choose a Product</option>
                                                            {slotProducts.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                    </div>

                                                    <div className="mt-4 flex flex-col items-center justify-center text-gray-200 border-2 border-dashed border-gray-100 rounded-lg py-8">
                                                        <Plus size={24} className="opacity-20" />
                                                    </div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Summary Section */}
                                <tr className="bg-gray-50">
                                    <td colSpan={5} className="p-3 text-xs font-black uppercase tracking-wider text-gray-500 border-b">Summary</td>
                                </tr>
                                <tr>
                                    <td className="p-6 border-b border-r font-bold text-gray-500 text-sm">Highlights</td>
                                    {products.map(p => (
                                        <td key={p.id} className="p-6 border-b border-r align-top">
                                            <ul className="space-y-2">
                                                {(typeof p.highlights === 'string' ? JSON.parse(p.highlights || '[]') : (p.highlights || [])).map((h, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></div>
                                                        {h}
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                    ))}
                                    {Array.from({ length: 4 - products.length }).map((_, i) => <td key={i} className="p-6 border-b border-r bg-gray-50/20"></td>)}
                                </tr>

                                {/* Rich Features Section */}
                                <tr className="bg-gray-50">
                                    <td colSpan={5} className="p-3 text-xs font-black uppercase tracking-wider text-gray-500 border-b">Rich Features</td>
                                </tr>
                                <tr>
                                    <td className="p-6 border-b border-r font-bold text-gray-500 text-sm">Product Features</td>
                                    {products.map(p => {
                                        const features = typeof p.product_features === 'string'
                                            ? JSON.parse(p.product_features || '[]')
                                            : (p.product_features || []);
                                        return (
                                            <td key={p.id} className="p-6 border-b border-r align-top">
                                                <div className="space-y-6">
                                                    {features.map((f, i) => (
                                                        <div key={i} className="space-y-2">
                                                            {f.image && (
                                                                <img
                                                                    src={f.image.startsWith('http') ? f.image : `${API_BASE_URL}${f.image}`}
                                                                    alt={f.title}
                                                                    className="w-full aspect-video object-cover rounded shadow-sm border"
                                                                />
                                                            )}
                                                            <p className="text-sm font-bold text-gray-900">{f.title}</p>
                                                            <p className="text-xs text-gray-600 leading-relaxed">{f.description}</p>
                                                        </div>
                                                    ))}
                                                    {features.length === 0 && <span className="text-sm text-gray-400 italic">No rich features listed</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    {Array.from({ length: 4 - products.length }).map((_, i) => <td key={i} className="p-6 border-b border-r bg-gray-50/20"></td>)}
                                </tr>

                                {/* General Specifications Section */}
                                <tr className="bg-gray-50">
                                    <td colSpan={5} className="p-3 text-xs font-black uppercase tracking-wider text-gray-500 border-b">General Specifications</td>
                                </tr>
                                {allSpecCategories.map(cat => (
                                    <tr key={cat}>
                                        <td className="p-6 border-b border-r font-bold text-gray-500 text-sm">{cat}</td>
                                        {products.map(p => (
                                            <td key={p.id} className="p-6 border-b border-r text-sm text-gray-700">
                                                {getSpecValue(p, cat)}
                                            </td>
                                        ))}
                                        {Array.from({ length: 4 - products.length }).map((_, i) => <td key={i} className="p-6 border-b border-r bg-gray-50/20"></td>)}
                                    </tr>
                                ))}

                                {/* Brand & Category */}
                                <tr className="bg-gray-50">
                                    <td colSpan={5} className="p-3 text-xs font-black uppercase tracking-wider text-gray-500 border-b">Details</td>
                                </tr>
                                <tr>
                                    <td className="p-6 border-b border-r font-bold text-gray-500 text-sm">Brand</td>
                                    {products.map(p => (
                                        <td key={p.id} className="p-6 border-b border-r text-sm text-gray-900 font-bold uppercase tracking-wider">{p.brand || 'Generic'}</td>
                                    ))}
                                    {Array.from({ length: 4 - products.length }).map((_, i) => <td key={i} className="p-6 border-b border-r bg-gray-50/20"></td>)}
                                </tr>
                                <tr>
                                    <td className="p-6 border-b border-r font-bold text-gray-500 text-sm">Rating</td>
                                    {products.map(p => (
                                        <td key={p.id} className="p-6 border-b border-r">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-600 text-white text-xs font-black px-2 py-0.5 rounded flex items-center gap-1">
                                                    {Number(p.avg_rating || 0).toFixed(1)} ★
                                                </span>
                                                <span className="text-gray-500 text-xs">({p.rating_count} reviews)</span>
                                            </div>
                                        </td>
                                    ))}
                                    {Array.from({ length: 4 - products.length }).map((_, i) => <td key={i} className="p-6 border-b border-r bg-gray-50/20"></td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Compare;
