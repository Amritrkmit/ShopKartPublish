import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Edit, Trash2, Plus, Search, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import ConfirmationModal from "../../components/ConfirmationModal";
import { encryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const CustomizedProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category`);
            setCategories(res.data);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/products`, {
                params: {
                    page,
                    limit: 20,
                    include_drafts: true,
                    search: debouncedSearchTerm,
                    is_customizable: 'true'
                },
                withCredentials: true
            });
            setProducts(res.data.products);
            setTotalPages(res.data.pagination.totalPages);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch products", err);
            toastError("Failed to fetch products");
            setLoading(false);
        }
    }, [page, debouncedSearchTerm]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
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
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/products/${id}`, { withCredentials: true });
            toastSuccess("Product deleted successfully");
            fetchProducts();
        } catch (err) {
            toastError("Failed to delete product");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Customized Products</h1>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Manage products with personalization options</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search customized products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <Link
                        to="/admin/products/add/"
                        className="w-full md:w-auto bg-orange-500 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-600 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Plus size={18} /> Add New
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-orange-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Custom Fields</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                                            <span>Loading customized products...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No customized products found
                                    </td>
                                </tr>
                            ) : (
                                products.map((p) => (
                                    <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {p.image ? (
                                                    <div className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={`${API_BASE_URL}${p.image}`}
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
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {(() => {
                                                try {
                                                    let fields = p.customization_fields;
                                                    if (!fields) return <span className="text-gray-400">Standard</span>;

                                                    // Deep parse logic
                                                    let attempts = 0;
                                                    while (typeof fields === 'string' && attempts < 5) {
                                                        try {
                                                            fields = JSON.parse(fields);
                                                        } catch (e) {
                                                            try {
                                                                const sanitized = fields.trim().replace(/\\"/g, '"');
                                                                if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
                                                                    fields = JSON.parse(sanitized.slice(1, -1));
                                                                } else {
                                                                    fields = JSON.parse(sanitized);
                                                                }
                                                            } catch (e2) {
                                                                return <span className="text-red-400">Parse Error</span>;
                                                            }
                                                        }
                                                        attempts++;
                                                    }

                                                    if (!Array.isArray(fields)) return <span className="text-gray-400">N/A</span>;

                                                    return (
                                                        <div className="flex flex-wrap gap-1">
                                                            {fields.map((f, idx) => (
                                                                <span key={idx} className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                                                                    {f.label || f.name}
                                                                </span>
                                                            ))}
                                                            {fields.length === 0 && (
                                                                <span className="text-gray-400 italic text-[10px]">No fields defined</span>
                                                            )}
                                                        </div>
                                                    );
                                                } catch (e) { return "Error"; }
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={p.status === 'published'}
                                                    onChange={() => handleStatusToggle(p.id, p.status || 'draft')}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/admin/products/edit/${encryptId(p.id)}/`}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
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
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-orange-50/30">
                        <div className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 text-gray-400 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 text-gray-400 hover:bg-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Customized Product?"
                message="Are you sure you want to delete this customized product? This action cannot be undone."
                confirmText="Delete Product"
                isDelete={true}
            />
        </div>
    );
};

export default CustomizedProducts;
