import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { Edit, Trash2, Plus, Search, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";
import { encryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerProductList = () => {
    const { confirm } = useConfirmation();
    const { seller } = useOutletContext();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = useCallback(async () => {
        if (!seller) {
            console.log('⚠️ No seller object available');
            return;
        }

        if (!seller.shop_id) {
            console.error('❌ CRITICAL: No shop_id in seller object');
            toastError("Unable to load products. Please contact support.");
            setLoading(false);
            return;
        }

        console.log('👤 Seller object:', seller);
        console.log('🏪 Shop ID:', seller.shop_id);

        setLoading(true);
        try {
            const params = {
                page,
                limit: 15,
                include_drafts: true,
                search: debouncedSearchTerm,
                is_customizable: 'false'
            };

            if (seller.shop_id) {
                params.shop_id = seller.shop_id;
                console.log('✅ Filtering by shop_id:', seller.shop_id);
            } else {
                console.warn('⚠️ No shop_id found in seller object - will show all products!');
            }

            console.log('📤 API Request params:', params);

            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/products`, {
                params,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                withCredentials: true
            });

            console.log('📦 Received products:', res.data.products?.length || 0);
            setProducts(res.data.products || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
        } catch (err) {
            console.error("Failed to fetch products", err);
            toastError("Failed to fetch products");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearchTerm, seller]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.patch(`${API_BASE_URL}/products/${id}/status`,
                { status: newStatus },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    withCredentials: true
                }
            );
            setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
            toastSuccess(`Product ${newStatus === 'published' ? 'Published' : 'Hidden'}`);
        } catch (err) {
            toastError("Failed to update status");
        }
    };

    const handleDelete = async (id) => {
        confirm({
            title: "Delete Product?",
            message: "Are you sure you want to delete this product permanently? This action cannot be undone.",
            confirmText: "Delete Product",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem("sellerToken");
                    await axios.delete(`${API_BASE_URL}/products/${id}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                        withCredentials: true
                    });
                    toastSuccess("Product removed");
                    fetchProducts();
                } catch (err) {
                    toastError("Failed to delete product");
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Catalog</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Product List</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/seller/products/add/")}
                                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Plus size={18} />
                                New Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search & Filters */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text" placeholder="Search by name, SKU..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                            <Filter size={16} /> Filters
                        </button>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] font-semibold uppercase tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left">Product Name</th>
                                    <th className="px-6 py-4 text-left">SKU</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Price</th>
                                    <th className="px-6 py-4 text-left">Stock</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-medium">Fetching catalog...</td></tr>
                                ) : products.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 italic">No products found matching your criteria.</td></tr>
                                ) : (
                                    products.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                                                        <img src={p.image ? `${API_BASE_URL.replace('/api', '')}${p.image}` : 'https://placehold.co/48'} className="w-full h-full object-cover" alt="" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 leading-snug">{p.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{p.category_name || 'Uncategorized'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-mono font-bold text-gray-500">{p.sku || '--'}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleStatusToggle(p.id, p.status)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${p.status === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                        }`}>
                                                    {p.status === 'published' ? 'Live' : 'Hidden'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-black text-gray-900">₹{p.price?.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5 min-w-[100px]">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${p.stock > 10 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {p.stock <= 0 ? 'Sold Out' : `${p.stock} in stock`}
                                                    </span>
                                                    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${p.stock > 10 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p.stock * 2, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    <Link to={`/seller/products/edit/${encryptId(p.id)}/`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerProductList;
