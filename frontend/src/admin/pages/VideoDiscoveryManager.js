import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Search, Plus, Trash2, ShoppingBag, Video, X, Upload, Pencil } from "lucide-react";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function VideoDiscoveryManager() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState("");
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    const [formData, setFormData] = useState({
        product_id: "",
        video_url: "",
        thumbnail_url: "",
        caption: ""
    });
    const [videoFile, setVideoFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);

    const fetchVideos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/videos`);
            setVideos(res.data);
        } catch (err) {
            toastError("Failed to fetch video feed");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const searchProducts = async (query) => {
        if (query.length < 2) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/products/search/by-name?q=${query}`);
            setProducts(res.data.products || []);
        } catch (err) {
            console.error("Search failed");
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/videos/${id}`, { withCredentials: true });
            toastSuccess("Video removed");
            fetchVideos();
        } catch (err) {
            toastError("Failed to delete video");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    const handleEdit = (video) => {
        setEditId(video.id);
        setFormData({
            product_id: video.product_id,
            video_url: video.video_url.startsWith('http') ? video.video_url : "",
            thumbnail_url: video.thumbnail_url?.startsWith('http') ? video.thumbnail_url : "",
            caption: video.caption || ""
        });
        setProductSearch(video.product_name);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product_id) return toastError("Please select a product");

        setSubmitting(true);
        const data = new FormData();
        data.append("product_id", formData.product_id);
        data.append("caption", formData.caption);

        if (videoFile) {
            data.append("video", videoFile);
        } else if (formData.video_url) {
            data.append("video_url", formData.video_url);
        } else {
            setSubmitting(false);
            return toastError("Please upload a video or provide a URL");
        }

        if (thumbnailFile) {
            data.append("thumbnail", thumbnailFile);
        } else if (formData.thumbnail_url) {
            data.append("thumbnail_url", formData.thumbnail_url);
        }

        try {
            if (editId) {
                await axios.put(`${API_BASE_URL}/api/videos/${editId}`, data, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toastSuccess("Video updated successfully!");
            } else {
                await axios.post(`${API_BASE_URL}/api/videos`, data, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                toastSuccess("Video added to discovery feed!");
            }
            setIsModalOpen(false);
            resetForm();
            fetchVideos();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to save video";
            toastError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ product_id: "", video_url: "", thumbnail_url: "", caption: "" });
        setVideoFile(null);
        setThumbnailFile(null);
        setProductSearch("");
        setProducts([]);
        setEditId(null);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Video Discovery</h1>
                    <p className="text-sm text-gray-500">Manage the Watch & Shop short-video feed</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#dc3545] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
                >
                    <Plus size={20} />
                    Add Video
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            ) : videos.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-20 text-center">
                    <Video size={48} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No videos yet</h3>
                    <p className="text-gray-500">Start by adding your first product video</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {videos.map((video) => (
                        <div key={video.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
                            <div className="relative aspect-[9/16] bg-black">
                                <video
                                    src={video.video_url.startsWith('http') ? video.video_url : `${API_BASE_URL}${video.video_url}`}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    poster={video.thumbnail_url?.startsWith('http') ? video.thumbnail_url : (video.thumbnail_url ? `${API_BASE_URL}${video.thumbnail_url}` : null)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                                    <p className="text-white text-sm font-bold truncate">{video.caption || video.product_name}</p>
                                    <p className="text-gray-300 text-xs truncate">Linked: {video.product_name}</p>
                                </div>
                                <div className="absolute top-2 right-2 flex gap-2 z-20">
                                    <button
                                        onClick={() => handleEdit(video)}
                                        className="p-2 bg-white/90 text-gray-900 rounded-full shadow-lg hover:bg-white transition-all transform hover:scale-110"
                                        title="Edit Video"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        className="p-2 bg-red-500/90 text-white rounded-full shadow-lg hover:bg-red-600 transition-all transform hover:scale-110"
                                        title="Delete Video"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold">{editId ? "Edit Video" : "Add Video to Feed"}</h2>
                            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Product Search */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Link Product</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search product by name..."
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            searchProducts(e.target.value);
                                        }}
                                    />
                                    {products.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg mt-1 shadow-xl max-h-48 overflow-y-auto z-10">
                                            {products.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, product_id: p.id });
                                                        setProductSearch(p.name);
                                                        setProducts([]);
                                                    }}
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 border-b last:border-0"
                                                >
                                                    <ShoppingBag size={14} className="text-gray-400" />
                                                    <span className="text-sm truncate">{p.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Caption / Hashtags</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Summer vibes! ☀️ #fashion"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    value={formData.caption}
                                    onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Video Source Choice */}
                                <div className="col-span-2 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Video Upload</label>
                                            <label className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 transition-colors h-24">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        setVideoFile(e.target.files[0]);
                                                        setFormData({ ...formData, video_url: "" });
                                                    }}
                                                />
                                                <Upload size={20} className="text-gray-400 mb-1" />
                                                <span className="text-[10px] text-center text-gray-500 truncate w-full px-2">
                                                    {videoFile ? videoFile.name : (editId && !formData.video_url ? "Current Local Video" : "Select MP4")}
                                                </span>
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">External URL</label>
                                            <div className="h-24 flex items-center">
                                                <input
                                                    type="text"
                                                    placeholder="YouTube/Insta URL"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                                    value={formData.video_url}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, video_url: e.target.value });
                                                        setVideoFile(null);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thumbnail Upload</label>
                                            <label className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 transition-colors h-24">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        setThumbnailFile(e.target.files[0]);
                                                        setFormData({ ...formData, thumbnail_url: "" });
                                                    }}
                                                />
                                                <Upload size={20} className="text-gray-400 mb-1" />
                                                <span className="text-[10px] text-center text-gray-500 truncate w-full px-2">
                                                    {thumbnailFile ? thumbnailFile.name : (editId && !formData.thumbnail_url ? "Current Local Thumb" : "Select JPG")}
                                                </span>
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Thumb URL</label>
                                            <div className="h-24 flex items-center">
                                                <input
                                                    type="text"
                                                    placeholder="External Image URL"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                                    value={formData.thumbnail_url}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, thumbnail_url: e.target.value });
                                                        setThumbnailFile(null);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-[#dc3545] text-white py-3 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                                >
                                    {submitting ? "Processing..." : "Publish to Feed"}
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
                title="Delete Video?"
                message="Are you sure you want to delete this video from the feed? This action cannot be undone."
                confirmText="Delete Video"
                isDelete={true}
            />
        </div>
    );
}
