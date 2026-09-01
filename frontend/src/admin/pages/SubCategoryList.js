import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SubCategoryList = () => {
    const [subcategories, setSubcategories] = useState([]);
    const { confirm } = useConfirmation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchSubcategories();
    }, []);

    const fetchSubcategories = async () => {
        try {
            const [subRes, catRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/subcategory`),
                axios.get(`${API_BASE_URL}/category`)
            ]);

            setSubcategories(subRes.data);
            setCategories(catRes.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data:", err);
            toastError("Failed to load subcategories");
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: "Delete Subcategory?",
            message: "Are you sure you want to delete this subcategory? This action cannot be undone.",
            confirmText: "Delete Subcategory",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/subcategory/${id}`);
                    toastSuccess("Subcategory deleted successfully");
                    fetchSubcategories();
                } catch (err) {
                    toastError("Failed to delete subcategory");
                    console.error(err);
                }
            }
        });
    };

    const getCategoryName = (catId) => {
        const cat = categories.find(c => c.id === catId);
        return cat ? cat.name : "Unknown";
    };

    const getParentSubcategoryName = (parentId) => {
        if (!parentId) return null;
        const parent = subcategories.find(s => s.id === parentId);
        return parent ? parent.name : "Unknown";
    };

    const filteredSubcategories = subcategories.filter(sub => {
        const categoryName = getCategoryName(sub.category_id).toLowerCase();
        const subName = sub.name.toLowerCase();
        const search = searchTerm.toLowerCase();
        return subName.includes(search) || categoryName.includes(search);
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredSubcategories.length / itemsPerPage);
    const paginatedSubcategories = filteredSubcategories.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading subcategories...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Subcategories</h1>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search subcategories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Link
                        to="/admin/subcategory/add/"
                        className="bg-[#dc3545] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-600 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Plus size={18} />
                        Add New
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    UID / Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Parent Group
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSubcategories.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No subcategories found matching "{searchTerm}"
                                    </td>
                                </tr>
                            ) : (
                                paginatedSubcategories.map((sub) => {
                                    const parentName = getParentSubcategoryName(sub.parent_id);
                                    const isGroup = !sub.parent_id;

                                    return (
                                        <tr key={sub.id} className={isGroup ? "bg-blue-50" : ""}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        {!isGroup && <span className="text-gray-400 mr-2">└─</span>}
                                                        <span className={`text-sm ${isGroup ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                            {sub.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-mono ml-6">{sub.uid || `ID: ${sub.id}`}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getCategoryName(sub.category_id)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {parentName || <span className="text-gray-400 italic">Top Level</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {sub.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        to={`/admin/subcategory/edit/${sub.url_token || sub.id}/`}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        <Edit size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(sub.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {subcategories.length === 0 && <div className="p-8 text-center text-gray-500">No subcategories found.</div>}

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
                                    // Logic to show a sliding window of pages could be added here, 
                                    // but for simplicity mirroring ProductList's strict 1-5 loop if totalPages < 5
                                    // or just showing all if small. 
                                    // Let's implement a simple version that matches ProductList's look.

                                    // Simplified render: just show first few or all if small count for now
                                    // to match the exact visual structure from ProductList
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

            <div className="mt-4 text-sm text-gray-500">
                <p>💡 <strong>Tip:</strong> Groups (top-level subcategories) are highlighted in blue. Items nested under groups are indented.</p>
            </div>

        </div>
    );
};

export default SubCategoryList;
