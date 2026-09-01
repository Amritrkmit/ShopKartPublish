import { useState, useEffect } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Upload, X, Save, ExternalLink, Plus, Trash2, Download } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function PromoManager() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingIndex, setEditingIndex] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    // State for editing existing promo
    const [editData, setEditData] = useState({
        title: "",
        subtitle: "",
        offer_text: "",
        link_url: "",
        status: "active"
    });

    // State for creating new promo
    const [newData, setNewData] = useState({
        title: "",
        subtitle: "",
        offer_text: "",
        link_url: "",
        status: "active"
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [newSelectedFile, setNewSelectedFile] = useState(null);
    const [newPreview, setNewPreview] = useState(null);

    useEffect(() => {
        fetchPromos();
    }, []);

    const fetchPromos = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/promos`);
            setPromos(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch promos", err);
            toastError("Failed to load promo banners");
            setLoading(false);
        }
    };

    const handleDownload = async (imageUrl, filename) => {
        try {
            const response = await fetch(`${API_BASE_URL}${imageUrl}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || "promo-image.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toastSuccess("Image download started!");
        } catch (error) {
            console.error("Download failed:", error);
            toastError("Failed to download image");
        }
    };

    const startEdit = (index) => {
        setEditingIndex(index);
        setIsAdding(false);
        setEditData({
            title: promos[index].title || "",
            subtitle: promos[index].subtitle || "",
            offer_text: promos[index].offer_text || "",
            link_url: promos[index].link_url || "",
            status: promos[index].status || "active"
        });
        setPreview(`${API_BASE_URL}${promos[index].image_url}`);
        setSelectedFile(null);
    };

    const handleFileChange = (e, type = "edit") => {
        const file = e.target.files[0];
        if (file) {
            if (type === "edit") {
                setSelectedFile(file);
                setPreview(URL.createObjectURL(file));
            } else {
                setNewSelectedFile(file);
                setNewPreview(URL.createObjectURL(file));
            }
        }
    };

    const handleSave = async (id) => {
        try {
            const formData = new FormData();
            formData.append("title", editData.title);
            formData.append("subtitle", editData.subtitle);
            formData.append("offer_text", editData.offer_text);
            formData.append("link_url", editData.link_url);
            formData.append("status", editData.status);
            if (selectedFile) {
                formData.append("image", selectedFile);
            }

            await axios.put(`${API_BASE_URL}/api/promos/${id}`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });

            toastSuccess("Promo banner updated successfully!");
            setEditingIndex(null);
            fetchPromos();
        } catch (err) {
            console.error("Failed to update promo", err);
            toastError("Failed to update promo banner");
        }
    };

    const handleCreate = async () => {
        if (!newSelectedFile) {
            toastError("Please select an image for the new promo banner");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("title", newData.title);
            formData.append("subtitle", newData.subtitle);
            formData.append("offer_text", newData.offer_text);
            formData.append("link_url", newData.link_url);
            formData.append("status", newData.status);
            formData.append("image", newSelectedFile);

            await axios.post(`${API_BASE_URL}/api/promos`, formData, {
                withCredentials: true,
                headers: { "Content-Type": "multipart/form-data" }
            });

            toastSuccess("New promo banner added successfully!");
            setIsAdding(false);
            setNewData({ title: "", subtitle: "", offer_text: "", link_url: "", status: "active" });
            setNewSelectedFile(null);
            setNewPreview(null);
            fetchPromos();
        } catch (err) {
            console.error("Failed to create promo", err);
            toastError("Failed to add new promo banner");
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/promos/${id}`, { withCredentials: true });
            toastSuccess("Promo banner deleted successfully!");
            fetchPromos();
        } catch (err) {
            console.error("Failed to delete promo", err);
            toastError("Failed to delete promo banner");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    if (loading) return <div className="p-8 text-center">Loading banners...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Home Promo Banners</h1>
                    <p className="text-gray-500">Manage the promotional slots on your home page</p>
                </div>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingIndex(null);
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} /> Add New Promo
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                    <h2 className="text-lg font-bold text-blue-800 mb-4">Add New Promo Banner</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="h-48 bg-white border-2 border-dashed border-blue-300 rounded-lg relative overflow-hidden flex flex-col items-center justify-center p-2">
                            {newPreview ? (
                                <>
                                    <img src={newPreview} alt="Preview" className="h-full w-full object-contain" />
                                    <button
                                        onClick={() => { setNewPreview(null); setNewSelectedFile(null); }}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <label className="flex flex-col items-center cursor-pointer">
                                    <Upload className="text-blue-400 mb-2" size={32} />
                                    <span className="text-sm text-blue-500 font-medium">Upload Image</span>
                                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, "create")} accept="image/*" />
                                </label>
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={newData.title}
                                        onChange={e => setNewData({ ...newData, title: e.target.value })}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Jackets, Sweatshirts.."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        value={newData.subtitle}
                                        onChange={e => setNewData({ ...newData, subtitle: e.target.value })}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Trendy & on a budget"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Offer Text</label>
                                    <input
                                        type="text"
                                        value={newData.offer_text}
                                        onChange={e => setNewData({ ...newData, offer_text: e.target.value })}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Min. 65% Off"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link URL</label>
                                    <input
                                        type="text"
                                        value={newData.link_url}
                                        onChange={e => setNewData({ ...newData, link_url: e.target.value })}
                                        className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="/ProductCategory or http://..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md"
                                >
                                    Create Promo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promos.map((promo, index) => (
                    <div key={promo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group transition-all hover:shadow-md">
                        <div className="relative h-40 bg-gray-100 p-2">
                            {editingIndex === index ? (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg relative">
                                    {preview ? (
                                        <>
                                            <img src={preview} alt="Preview" className="h-full w-full object-contain" />
                                            <button
                                                onClick={() => { setPreview(null); setSelectedFile(null); }}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                                            >
                                                <X size={14} />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="flex flex-col items-center cursor-pointer">
                                            <Upload className="text-gray-400 mb-2" size={24} />
                                            <span className="text-xs text-gray-500 font-medium">Click to upload image</span>
                                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                        </label>
                                    )}
                                </div>
                            ) : (
                                <img
                                    src={`${API_BASE_URL}${promo.image_url}`}
                                    alt={promo.title}
                                    className="h-full w-full object-contain rounded-lg"
                                />
                            )}
                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-gray-800/80 text-white text-[10px] rounded font-bold uppercase transition-opacity">
                                Slot {index + 1}
                            </div>

                            {!editingIndex && (
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button
                                        onClick={() => handleDownload(promo.image_url, `${promo.title || 'promo'}-${promo.id}.png`)}
                                        className="p-2 bg-white/90 text-blue-500 rounded-lg shadow-sm hover:bg-blue-50"
                                        title="Download Image"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(promo.id)}
                                        className="p-2 bg-white/90 text-red-500 rounded-lg shadow-sm hover:bg-red-50"
                                        title="Delete Promo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            {editingIndex === index ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={editData.title}
                                            onChange={e => setEditData({ ...editData, title: e.target.value })}
                                            className="w-full text-sm font-semibold border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                            placeholder="e.g. Jackets, Sweatshirts.."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Subtitle</label>
                                        <input
                                            type="text"
                                            value={editData.subtitle}
                                            onChange={e => setEditData({ ...editData, subtitle: e.target.value })}
                                            className="w-full text-xs text-gray-600 border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                            placeholder="e.g. Trendy & on a budget"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Offer Text</label>
                                        <input
                                            type="text"
                                            value={editData.offer_text}
                                            onChange={e => setEditData({ ...editData, offer_text: e.target.value })}
                                            className="w-full text-xs font-bold text-blue-600 border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                            placeholder="e.g. Min. 65% Off"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link URL</label>
                                        <input
                                            type="text"
                                            value={editData.link_url}
                                            onChange={e => setEditData({ ...editData, link_url: e.target.value })}
                                            className="w-full text-[10px] text-gray-500 border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                                            placeholder="/ProductCategory or http://..."
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2 mt-auto">
                                        <button
                                            onClick={() => handleSave(promo.id)}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-700"
                                        >
                                            <Save size={14} /> Save
                                        </button>
                                        <button
                                            onClick={() => setEditingIndex(null)}
                                            className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{promo.title || "No Title"}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-1 mb-1">{promo.subtitle || "No Subtitle"}</p>
                                    <p className="text-xs font-bold text-blue-600 mb-3">{promo.offer_text || "No Offer"}</p>

                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-4">
                                        <ExternalLink size={10} /> {promo.link_url || "No link"}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-gray-50 flex gap-2">
                                        <button
                                            onClick={() => startEdit(index)}
                                            className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                                        >
                                            Edit Slot
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Promo Banner?"
                message="Are you sure you want to delete this promo banner? This action cannot be undone."
                confirmText="Delete Banner"
                isDelete={true}
            />
        </div>
    );
}
