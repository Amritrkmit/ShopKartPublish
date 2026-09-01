import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, Trash2, Plus, Target, AlertCircle } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import ConfirmationModal from "../../components/ConfirmationModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const PriceHuntManager = () => {
    const [activeHunts, setActiveHunts] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    const [settings, setSettings] = useState({
        title: "",
        description: "",
        discount_text: "",
        hunt_link: "",
        is_active: "true",
        hunt_expiry: ""
    });
    const [deleteModal, setDeleteModal] = useState({ show: false, product: null });

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/settings/price_hunt`);
            setSettings(prev => ({ ...prev, ...res.data }));
        } catch (err) {
            console.error("Failed to fetch settings", err);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const saveSettings = async () => {
        try {
            await axios.post(`${API_BASE_URL}/settings/update`, {
                group: 'price_hunt',
                settings: settings
            });
            toastSuccess("Settings saved successfully!");
        } catch (err) {
            console.error(err);
            toastError("Failed to save settings");
        }
    };


    // Fetch active hunt targets
    const fetchActiveHunts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/hunt/admin/all`);
            setActiveHunts(res.data);
        } catch (err) {
            console.error("Failed to fetch hunts", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveHunts();
    }, []);

    // Search for products to add
    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length < 3) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            // Reusing the general product search API
            const res = await axios.get(`${API_BASE_URL}/products?search=${query}&limit=5`);
            // Filter out products already in the hunt
            const filtered = res.data.products.filter(p => !activeHunts.find(h => h.id === p.id));
            setSearchResults(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    // Toggle Hunt Status
    const toggleHuntStatus = async (product, status) => {
        if (status === false) {
            setDeleteModal({ show: true, product });
            return;
        }
        await updateHuntStatus(product, status);
    };

    const confirmRemove = async () => {
        if (deleteModal.product) {
            await updateHuntStatus(deleteModal.product, false);
            setDeleteModal({ show: false, product: null });
        }
    };

    const updateHuntStatus = async (product, status) => {
        try {
            await axios.post(`${API_BASE_URL}/hunt/admin/toggle`, {
                product_id: product.id,
                status: status
            });

            toastSuccess(status ? "Added to Hunt!" : "Removed from Hunt!");

            // Refresh list
            fetchActiveHunts();
            setSearchQuery("");
            setSearchResults([]);
        } catch (err) {
            console.error(err);
            toastError("Failed to update status");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading hunt data...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                    <Target size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">The Great Price Hunt Manager</h1>
                    <p className="text-sm text-gray-500">Manage hidden treasure items. Active items appear as "Mystery Items" on the homepage.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Active Targets */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Settings Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Display Configuration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={settings.title}
                                    onChange={handleSettingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={settings.description}
                                    onChange={handleSettingChange}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="is_active"
                                    value={settings.is_active}
                                    onChange={handleSettingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="true">Active (Visible)</option>
                                    <option value="false">Inactive (Hidden)</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hunt Expiry Date</label>
                                <input
                                    type="datetime-local"
                                    name="hunt_expiry"
                                    value={settings.hunt_expiry ? new Date(new Date(settings.hunt_expiry).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                                    onChange={handleSettingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex items-end col-span-2">
                                <button
                                    onClick={saveSettings}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Active Targets</h2>
                                <p className="text-xs text-gray-500 mt-1">{activeHunts.length} items currently hidden</p>
                            </div>
                            {activeHunts.length < 3 && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                                    <AlertCircle size={14} />
                                    <span>Add {3 - activeHunts.length} more for optimal display</span>
                                </div>
                            )}
                        </div>

                        {activeHunts.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <Target size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No active hunt targets.</p>
                                <p className="text-xs mt-2">Search for products on the right to add them.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {activeHunts.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg p-2 border border-gray-200">
                                            <img
                                                src={item.image.startsWith('http') ? item.image : `${API_BASE_URL.replace('/api', '')}${item.image}`}
                                                alt={item.name}
                                                className="w-full h-full object-contain mix-blend-multiply"
                                                onError={(e) => e.target.src = "https://via.placeholder.com/150"}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.name}</h3>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">ID: {item.id}</span>
                                                <span>₹{item.price}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleHuntStatus(item, false)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Remove from Hunt"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Add New */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Add Mystery Item</h2>

                        <div className="space-y-4 mb-6"> {/* Added a div for spacing the settings fields */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Text</label>
                                <input
                                    type="text"
                                    name="discount_text"
                                    value={settings.discount_text}
                                    onChange={handleSettingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Button Link</label>
                                <input
                                    type="text"
                                    name="hunt_link"
                                    value={settings.hunt_link || "/categories"}
                                    onChange={handleSettingChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                            />
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {searching ? (
                                <div className="text-center py-4 text-xs text-gray-400">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(product => (
                                    <div key={product.id} className="p-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all group flex items-center gap-3 cursor-pointer" onClick={() => toggleHuntStatus(product, true)}>
                                        <img
                                            src={product.image.startsWith('http') ? product.image : `${API_BASE_URL.replace('/api', '')}${product.image}`}
                                            className="w-10 h-10 object-contain bg-white rounded border border-gray-200"
                                            alt=""
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                                            <p className="text-[10px] text-gray-500">ID: {product.id}</p>
                                        </div>
                                        <button className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-full text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : searchQuery.length >= 3 ? (
                                <div className="text-center py-4 text-xs text-gray-400">No products found</div>
                            ) : (
                                <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    Type to search products
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, product: null })}
                onConfirm={confirmRemove}
                title="Remove from Hunt?"
                message={`Are you sure you want to remove ${deleteModal.product?.name} from the Price Hunt mystery list?`}
                confirmText="Remove Item"
                isDelete={true}
            />
        </div>
    );
};

export default PriceHuntManager;
