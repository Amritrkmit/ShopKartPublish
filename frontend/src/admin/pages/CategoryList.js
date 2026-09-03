import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Edit, Trash2, Plus } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const CategoryList = () => {
    const [categories, setCategories] = useState([]);
    const { confirm } = useConfirmation();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category`);
            setCategories(res.data);
        } catch (err) {
            console.error("Failed to fetch categories", err);
            toastError("Failed to fetch categories");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: "Delete Category?",
            message: "Are you sure you want to delete this category? This action cannot be undone.",
            confirmText: "Delete Category",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/category/${id}`);
                    toastSuccess("Category deleted successfully");
                    fetchCategories();
                } catch (err) {
                    toastError("Failed to delete category");
                }
            }
        });
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading categories...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Link
                        to="/admin/category/add/"
                        className="bg-[#dc3545] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-600 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Plus size={18} /> Add New
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">UID / Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No categories found matching "{searchTerm}"
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cat.image ? (
                                                <div className="h-10 w-10 rounded-lg border border-gray-100 overflow-hidden">
                                                    <img src={`${API_BASE_URL}${cat.image.replace(/^\/?assets/, "/assets")}`} alt={cat.name} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No Img</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{cat.name}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">{cat.uid || `ID: ${cat.id}`}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.slug}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full border ${cat.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {cat.active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/admin/category/edit/${cat.url_token || cat.id}/`}
                                                    className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg transition-colors"
                                                >
                                                    <Edit size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
};

export default CategoryList;
