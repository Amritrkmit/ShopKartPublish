import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Edit, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";
import { encryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [brandFilter, setBrandFilter] = useState("");
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const { confirm } = useConfirmation();

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category`);
            setCategories(res.data);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    }, []);

    const fetchBrands = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/brands`);
            setBrands(res.data);
        } catch (err) {
            console.error("Failed to fetch brands", err);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            // Include drafts in admin view
            const res = await axios.get(`${API_BASE_URL}/products`, {
                params: {
                    page,
                    limit: 20,
                    include_drafts: true,
                    search: debouncedSearchTerm,
                    category_id: categoryFilter,
                    brand: brandFilter,
                    is_customizable: 'false'
                },
                withCredentials: true // Important to send adminToken cookie
            });
            setProducts(res.data.products);
            setTotalPages(res.data.pagination.totalPages);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch products", err);
            toastError("Failed to fetch products");
            setLoading(false);
        }
    }, [page, debouncedSearchTerm, categoryFilter, brandFilter]);

    useEffect(() => {
        fetchCategories();
        fetchBrands();
    }, [fetchCategories, fetchBrands]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleStatusToggle = async (id, currentStatus) => {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        try {
            await axios.patch(`${API_BASE_URL}/products/${id}/status`, { status: newStatus }, { withCredentials: true });
            setProducts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
            toastSuccess(`Product ${newStatus === 'published' ? 'Published' : 'Unpublished'}`);
        } catch (err) {
            toastError("Failed to update status");
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: "Delete Product?",
            message: "Are you sure you want to delete this product? This action cannot be undone.",
            confirmText: "Delete Product",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/products/${id}`, { withCredentials: true });
                    toastSuccess("Product deleted successfully");
                    fetchProducts();
                } catch (err) {
                    toastError("Failed to delete product");
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Products</h1>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPage(1);
                        }}
                        className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <select
                        value={brandFilter}
                        onChange={(e) => {
                            setBrandFilter(e.target.value);
                            setPage(1);
                        }}
                        className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Brands</option>
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.name}>{brand.name}</option>
                        ))}
                    </select>
                    <Link
                        to="/admin/products/add/"
                        className="w-full md:w-auto bg-[#dc3545] text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Plus size={18} /> Add New
                    </Link>
                </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        {/* ... Table Header ... */}
                        <thead className="bg-gray-50">
                            <tr>
                                {/* ... other headers ... */}
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Product
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Uploaded By
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status (Active)
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dc3545]"></div>
                                            <span>Loading products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No products found
                                    </td>
                                </tr>
                            ) : (
                                products.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        {/* ... Product, Category, Price cols ... */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {p.image ? (
                                                    <div className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={`${API_BASE_URL}${p.image.replace(/^\/?assets/, "/assets")}`}
                                                            alt={p.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                                                        No Image
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{p.name}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">{p.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {categories.find(c => c.id === p.category_id)?.name || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{parseFloat(p.price).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block w-fit ${p.shop_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {p.shop_id ? 'Seller' : 'Admin'}
                                                </span>
                                                {p.shop_name && (
                                                    <span className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-tighter truncate max-w-[120px]">
                                                        {p.shop_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={p.status === 'published'}
                                                    onChange={() => handleStatusToggle(p.id, p._status_loading ? p.status : (p.status || 'draft'))}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                <span className="ml-3 text-sm font-medium text-gray-900">
                                                    {p.status === 'published' ? 'Active' : 'Draft'}
                                                </span>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/admin/products/edit/${encryptId(p.id)}/`}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${page === pageNum
                                                ? 'bg-[#dc3545] text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default ProductList;
