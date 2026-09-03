import { useState, useEffect } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Upload, X, Save, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Info, Pencil } from "lucide-react";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const CollectionManager = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [isAddingCollection, setIsAddingCollection] = useState(false);
    const [newCollection, setNewCollection] = useState({ title: "", type: "grid", link_url: "", order_index: 0 });
    const [editingCollection, setEditingCollection] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, type: null }); // type: 'collection' or 'item'

    // Item editing state
    const [editingItem, setEditingItem] = useState(null);
    const [itemData, setItemData] = useState({ title: "", subtitle: "", offer_text: "", link_url: "" });
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);

    // Product Search state
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/collections/admin`, { withCredentials: true });
            setCollections(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch collections", err);
            toastError("Failed to load home highlights");
            setLoading(false);
        }
    };

    const handleProductSearch = async (query) => {
        setProductSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/search/by-name?q=${query}`);
            setSearchResults(res.data.products);
            setShowResults(true);
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    const selectProduct = (product) => {
        setItemData({
            ...itemData,
            title: product.name,
            link_url: `/product/${product.slug}`
        });
        if (product.image) {
            const imageUrl = product.image.startsWith('http') ? product.image : `${API_BASE_URL}${product.image}`;
            setPreview(imageUrl);
            // We don't set selectedFile here because we're using an existing URL
            // But the backend expects 'image' field for new images. 
            // In the backend, if no file is sent, it might fall back to placeholder.
            // I should handle this in the backend too, or send the image URL.
        }
        setProductSearch("");
        setSearchResults([]);
        setShowResults(false);
    };

    const handleCreateCollection = async () => {
        if (!newCollection.title) return toastError("Title is required");
        try {
            if (editingCollection) {
                await axios.put(`${API_BASE_URL}/api/collections/${editingCollection.id}`, newCollection, { withCredentials: true });
                toastSuccess("Collection section updated!");
            } else {
                await axios.post(`${API_BASE_URL}/api/collections`, newCollection, { withCredentials: true });
                toastSuccess("Collection section created!");
            }
            setIsAddingCollection(false);
            setEditingCollection(null);
            setNewCollection({ title: "", type: "grid", link_url: "", order_index: 0 });
            fetchCollections();
        } catch (err) {
            toastError(editingCollection ? "Failed to update collection" : "Failed to create collection");
        }
    };

    const startEditCollection = (col) => {
        setEditingCollection(col);
        setNewCollection({
            title: col.title || "",
            type: col.type || "grid",
            link_url: col.link_url || "",
            order_index: col.order_index || 0
        });
        setIsAddingCollection(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCollection = (id) => {
        setDeleteModal({ show: true, id, type: 'collection' });
    };

    const handleAddItem = async (collectionId) => {
        if (!selectedFile && !editingItem && !preview) return toastError("Image is required for new items");

        const formData = new FormData();
        formData.append("title", itemData.title);
        formData.append("subtitle", itemData.subtitle);
        formData.append("offer_text", itemData.offer_text);
        formData.append("link_url", itemData.link_url);
        if (selectedFile) {
            formData.append("image", selectedFile);
        } else if (preview) {
            formData.append("image_url", preview);
        }

        try {
            if (editingItem) {
                await axios.put(`${API_BASE_URL}/api/collections/items/${editingItem.id}`, formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                });
                toastSuccess("Item updated");
            } else {
                await axios.post(`${API_BASE_URL}/api/collections/${collectionId}/items`, formData, {
                    withCredentials: true,
                    headers: { "Content-Type": "multipart/form-data" }
                });
                toastSuccess("Item added to collection");
            }
            setEditingItem(null);
            setItemData({ title: "", subtitle: "", offer_text: "", link_url: "" });
            setSelectedFile(null);
            setPreview(null);
            fetchCollections();
        } catch (err) {
            toastError(editingItem ? "Failed to update item" : "Failed to add item");
        }
    };

    const handleDeleteItem = (itemId) => {
        setDeleteModal({ show: true, id: itemId, type: 'item' });
    };

    const confirmDelete = async () => {
        const { id, type } = deleteModal;
        if (!id || !type) return;

        try {
            if (type === 'collection') {
                await axios.delete(`${API_BASE_URL}/api/collections/${id}`, { withCredentials: true });
                toastSuccess("Collection deleted");
            } else if (type === 'item') {
                await axios.delete(`${API_BASE_URL}/api/collections/items/${id}`, { withCredentials: true });
                toastSuccess("Item removed");
            }
            fetchCollections();
        } catch (err) {
            toastError(type === 'collection' ? "Failed to delete collection" : "Failed to remove item");
        } finally {
            setDeleteModal({ show: false, id: null, type: null });
        }
    };

    const startEditItem = (item) => {
        setEditingItem(item);
        setItemData({
            title: item.title || "",
            subtitle: item.subtitle || "",
            offer_text: item.offer_text || "",
            link_url: item.link_url || ""
        });
        setPreview(`${API_BASE_URL}${item.image_url}`);
    };

    if (loading) return <div className="p-8 text-center">Loading collections...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Home Highlights Manager</h1>
                    <p className="text-gray-500">Manage Featured Collections and Highlight Grids on the Home page</p>
                </div>
                <button
                    onClick={() => {
                        setIsAddingCollection(true);
                        setEditingCollection(null);
                        setNewCollection({ title: "", type: "grid", link_url: "", order_index: 0 });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} /> New Highlight Section
                </button>
            </div>

            {isAddingCollection && (
                <div className="mb-8 p-6 bg-white border border-blue-200 rounded-xl shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">{editingCollection ? "Edit Highlight Section" : "Create New Highlight Section"}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Section Title</label>
                            <input
                                type="text"
                                value={newCollection.title}
                                onChange={e => setNewCollection({ ...newCollection, title: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Christmas Specials"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase mb-1">
                                Layout Type
                                <span title="Grid: 2x2 layout for 4 items. Feature: Large hero card with 3 images." className="cursor-help text-blue-400"><Info size={12} /></span>
                            </label>
                            <select
                                value={newCollection.type}
                                onChange={e => setNewCollection({ ...newCollection, type: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="grid">2x2 Grid (Best for 4 items)</option>
                                <option value="feature">Feature Card (Large card with items)</option>
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1 italic">Determines how the items are arranged on the home page.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Global Link (Optional)</label>
                            <input
                                type="text"
                                value={newCollection.link_url}
                                onChange={e => setNewCollection({ ...newCollection, link_url: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. /category/electronics"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase mb-1">
                                Display Order
                                <span title="Numerical position. Lower values (e.g. 0, 1) appear first at the top of the page." className="cursor-help text-blue-400"><Info size={12} /></span>
                            </label>
                            <input
                                type="number"
                                value={newCollection.order_index}
                                onChange={e => setNewCollection({ ...newCollection, order_index: parseInt(e.target.value) || 0 })}
                                className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Lower numbers appear first. Example: 0 is top, 10 is bottom.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                        <button onClick={() => { setIsAddingCollection(false); setEditingCollection(null); }} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                        <button onClick={handleCreateCollection} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">
                            {editingCollection ? "Update Section" : "Create Section"}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {collections.map((col) => (
                    <div key={col.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedId(expandedId === col.id ? null : col.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${col.type === 'grid' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                    <ImageIcon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{col.title}</h3>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Position: {col.order_index || 0} • {col.type} Layout • {col.items.length} items</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); startEditCollection(col); }}
                                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="Edit Section Details"
                                >
                                    <Save size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                                {expandedId === col.id ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                            </div>
                        </div>

                        {expandedId === col.id && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Item List */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Section Items</h4>
                                        <div className="space-y-3">
                                            {col.items.map((item) => (
                                                <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                                                    <img src={item.image_url.startsWith('http') ? item.image_url : `${API_BASE_URL}${item.image_url}`} alt="" className="w-12 h-12 object-cover rounded bg-gray-100" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{item.title || "Untitled Item"}</p>
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 font-medium truncate">{item.link_url}</p>
                                                        <p className="text-xs text-blue-600 font-bold">{item.offer_text}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => startEditItem(item)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                                                            title="Edit Item"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {col.items.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No items in this section yet.</p>}
                                        </div>
                                    </div>

                                    {/* Add/Edit Item Form */}
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm self-start">
                                        <h4 className="text-sm font-bold text-gray-800 mb-4">{editingItem ? "Edit Item" : "Add New Item"}</h4>
                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 relative flex items-center justify-center overflow-hidden">
                                                    {preview ? (
                                                        <>
                                                            <img src={preview} alt="" className="w-full h-full object-cover" />
                                                            <button onClick={() => { setPreview(null); setSelectedFile(null); }} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full">
                                                                <X size={10} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <label className="cursor-pointer flex flex-col items-center">
                                                            <Upload size={20} className="text-gray-400" />
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">Upload</span>
                                                            <input type="file" className="hidden" onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setSelectedFile(file);
                                                                    setPreview(URL.createObjectURL(file));
                                                                }
                                                            }} />
                                                        </label>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3 relative">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder="Search Product to Link..."
                                                            value={productSearch}
                                                            onChange={e => handleProductSearch(e.target.value)}
                                                            onFocus={() => productSearch.length >= 2 && setShowResults(true)}
                                                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        {showResults && searchResults.length > 0 && (
                                                            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                                                                {searchResults.map(p => (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => selectProduct(p)}
                                                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                                    >
                                                                        <img src={p.image?.startsWith('http') ? p.image : `${API_BASE_URL}${p.image}`} alt="" className="w-8 h-8 object-contain bg-gray-50 rounded" />
                                                                        <div className="min-w-0">
                                                                            <p className="text-[11px] font-bold text-gray-800 truncate">{p.name}</p>
                                                                            <p className="text-[10px] text-gray-400">₹{p.price}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder="Title (e.g. Lipstick)"
                                                        value={itemData.title}
                                                        onChange={e => setItemData({ ...itemData, title: e.target.value })}
                                                        className="w-full text-sm border-b border-gray-200 py-1 outline-none focus:border-blue-500 font-medium"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Subtitle (Optional)"
                                                        value={itemData.subtitle}
                                                        onChange={e => setItemData({ ...itemData, subtitle: e.target.value })}
                                                        className="w-full text-xs border-b border-gray-200 py-1 outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="text"
                                                    placeholder="Offer (e.g. Min 50% Off)"
                                                    value={itemData.offer_text}
                                                    onChange={e => setItemData({ ...itemData, offer_text: e.target.value })}
                                                    className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Link URL"
                                                    value={itemData.link_url}
                                                    onChange={e => setItemData({ ...itemData, link_url: e.target.value })}
                                                    className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div className="flex gap-2 justify-end pt-2">
                                                {editingItem && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem(null);
                                                            setItemData({ title: "", subtitle: "", offer_text: "", link_url: "" });
                                                            setPreview(null);
                                                            setSelectedFile(null);
                                                        }}
                                                        className="flex-1 px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-bold hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAddItem(col.id)}
                                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm"
                                                >
                                                    {editingItem ? "Update Item" : "Add Item"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {collections.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">No collections created yet</h3>
                        <p className="text-gray-400 mb-6">Start by creating a new highlight section for your home page</p>
                        <button
                            onClick={() => setIsAddingCollection(true)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
                        >
                            Get Started
                        </button>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null, type: null })}
                onConfirm={confirmDelete}
                title={deleteModal.type === 'collection' ? "Delete Collection Section?" : "Delete Item?"}
                message={deleteModal.type === 'collection'
                    ? "Are you sure you want to delete this entire collection section? All items inside it will also be removed."
                    : "Are you sure you want to remove this item from the collection?"}
                confirmText={deleteModal.type === 'collection' ? "Delete Section" : "Remove Item"}
                isDelete={true}
            />
        </div>
    );
};

export default CollectionManager;
