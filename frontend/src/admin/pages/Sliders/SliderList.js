import { useState, useEffect } from "react";
import axios from "axios";
import { Edit, Trash2, Plus, Search, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toastSuccess, toastError } from "../../../utils/toast";
import ConfirmationModal from "../../../components/ConfirmationModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const SliderList = () => {
    const [sliders, setSliders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSlider, setEditingSlider] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editImage, setEditImage] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
    const itemsPerPage = 10;

    useEffect(() => {
        fetchSliders();
    }, []);

    const fetchSliders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/slider`);
            setSliders(res.data);
        } catch (err) {
            console.error("Failed to fetch sliders", err);
            toastError("Failed to fetch sliders");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (slider) => {
        setEditingSlider(slider);
        setEditTitle(slider.title);
        setEditImage(null);
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("title", editTitle);
            if (editImage) {
                formData.append("image", editImage);
            }

            await axios.put(`${API_BASE_URL}/slider/${editingSlider.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toastSuccess("Slider updated successfully");
            setShowEditModal(false);
            fetchSliders();
        } catch (err) {
            console.error("Failed to update slider", err);
            toastError("Failed to update slider");
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/slider/${id}`);
            toastSuccess("Slider deleted successfully");
            fetchSliders();
        } catch (err) {
            console.error("Failed to delete slider", err);
            toastError("Failed to delete slider");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    // Filter and pagination
    const filteredSliders = sliders.filter((slider) =>
        slider.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredSliders.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSliders = filteredSliders.slice(startIndex, endIndex);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading sliders...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sliders</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage your homepage sliders</p>
                </div>
                <Link
                    to="/admin/slider/add/"
                    className="bg-[#dc3545] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-600 shadow-sm transition-colors text-sm font-medium"
                >
                    <Plus size={18} /> Add Slider
                </Link>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search sliders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Sliders Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Slider
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentSliders.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                        No sliders found
                                    </td>
                                </tr>
                            ) : (
                                currentSliders.map((slider) => (
                                    <tr key={slider.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {slider.image ? (
                                                    <div className="h-12 w-20 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={`${API_BASE_URL}${slider.image}`}
                                                            alt={slider.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                                                        <ImageIcon size={20} />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                                        {slider.title || "Untitled Slider"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">#{slider.id}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(slider)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(slider.id)}
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
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                                                ? "bg-[#dc3545] text-white"
                                                : "text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Edit Slider</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Image
                                </label>
                                {editingSlider.image && (
                                    <img
                                        src={`${API_BASE_URL}${editingSlider.image}`}
                                        alt={editingSlider.title}
                                        className="w-full h-32 object-cover rounded border border-gray-200 mb-2"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Image (optional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setEditImage(e.target.files[0])}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-[#dc3545] text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Slider?"
                message="Are you sure you want to delete this slider? This action cannot be undone."
                confirmText="Delete Slider"
                isDelete={true}
            />
        </div>
    );
};

export default SliderList;
