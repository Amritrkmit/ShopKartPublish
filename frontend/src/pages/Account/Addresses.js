import React, { useEffect, useState } from "react";
import axios from "axios";
import AccountLayout from "./AccountLayout";
import { toastSuccess, toastError } from "../../utils/toast";
import { Trash2, Edit2, MapPin, Plus, Locate, Loader, Search } from "lucide-react";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const Addresses = () => {
    const [addresses, setAddresses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null); // Track which address is being edited
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const { confirm } = useConfirmation();
    const [formData, setFormData] = useState({
        full_name: "",
        mobile: "",
        alternate_mobile: "",
        flat_house: "",
        address_line1: "",
        city: "",
        state: "",
        zip_code: "",
        country: "India",
        type: "Home",
        is_default: false
    });

    const token = localStorage.getItem("userToken");

    // Fetch Addresses
    useEffect(() => {
        if (token) {
            axios.get(`${API_BASE_URL}/users/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => setAddresses(res.data))
                .catch(err => console.error("Failed to load addresses"));
        }
    }, [token]);

    const handleEdit = (addr) => {
        setFormData({
            full_name: addr.full_name || "",
            mobile: addr.mobile || "",
            alternate_mobile: addr.alternate_mobile || "",
            flat_house: addr.flat_house || "",
            address_line1: addr.address_line1,
            city: addr.city,
            state: addr.state,
            zip_code: addr.zip_code,
            country: addr.country || "India",
            type: addr.type || "Home",
            is_default: Boolean(addr.is_default)
        });
        setEditingId(addr.id);
        setShowForm(true);
    };

    const fetchCurrentLocation = () => {
        if (!navigator.geolocation) {
            toastError("Geolocation is not supported by your browser");
            return;
        }

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Using OpenStreetMap Nominatim for Reverse Geocoding
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const address = res.data.address;

                setFormData(prev => ({
                    ...prev,
                    address_line1: `${address.road || ''} ${address.suburb || ''}`.trim() || prev.address_line1,
                    city: address.city || address.town || address.village || prev.city,
                    state: address.state || prev.state,
                    zip_code: address.postcode || prev.zip_code,
                    country: address.country || prev.country
                }));
                toastSuccess("Location fetched successfully");
            } catch (error) {
                console.error("Geocoding failed", error);
                toastError("Failed to fetch address details");
            } finally {
                setLoadingLocation(false);
            }
        }, (error) => {
            console.error("Geolocation error", error);
            setLoadingLocation(false);
            toastError("Unable to retrieve your location");
        });
    };

    const handleAddressSearch = async (query) => {
        if (!query || query.length < 3) return;
        setSearching(true);
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&addressdetails=1&limit=5`);
            setSearchResults(res.data);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSearch = (result) => {
        const address = result.address;
        setFormData(prev => ({
            ...prev,
            address_line1: `${address.road || ''} ${address.suburb || ''} ${address.neighbourhood || ''}`.trim() || result.display_name.split(',')[0],
            city: address.city || address.town || address.village || address.county || prev.city,
            state: address.state || prev.state,
            zip_code: address.postcode || prev.zip_code,
            country: address.country || prev.country
        }));
        setSearchResults([]);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ full_name: "", mobile: "", alternate_mobile: "", flat_house: "", address_line1: "", city: "", state: "", zip_code: "", country: "India", type: "Home", is_default: false });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing
                await axios.put(`${API_BASE_URL}/users/addresses/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSuccess("Address updated successfully");
                setAddresses(prev => prev.map(a => a.id === editingId ? { ...formData, id: editingId } : a));
                handleCancel(); // Reset form and hide for update
            } else {
                // Create new
                const res = await axios.post(`${API_BASE_URL}/users/addresses`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toastSuccess("Address added successfully");
                setAddresses(prev => [...prev, { ...formData, id: res.data.id }]);
                setShowForm(false);
                setFormData({ full_name: "", mobile: "", alternate_mobile: "", flat_house: "", address_line1: "", city: "", state: "", zip_code: "", country: "India", type: "Home", is_default: false });
            }
        } catch (err) {
            console.error(err);
            toastError(`Failed to ${editingId ? 'update' : 'add'} address`);
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: "Delete Address?",
            message: "Are you sure you want to remove this address? This action cannot be undone.",
            confirmText: "Delete Address",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/users/addresses/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAddresses(prev => prev.filter(a => a.id !== id));
                    toastSuccess("Address deleted");
                } catch (err) {
                    toastError("Failed to delete address");
                }
            }
        });
    };

    return (
        <AccountLayout>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <MapPin className="text-blue-600" /> Manage Addresses
                </h2>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setFormData({ full_name: "", mobile: "", alternate_mobile: "", flat_house: "", address_line1: "", city: "", state: "", zip_code: "", country: "India", type: "Home", is_default: false }); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={16} /> Add New Address
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl border mb-6 grid gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="col-span-2 flex justify-end">
                        <button
                            type="button"
                            onClick={fetchCurrentLocation}
                            disabled={loadingLocation}
                            className="text-xs flex items-center gap-1 text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                        >
                            {loadingLocation ? <Loader size={14} className="animate-spin" /> : <Locate size={14} />}
                            Use My Current Location
                        </button>
                    </div>

                    {/* Address Search Input */}
                    <div className="col-span-2 relative">
                        <label className="text-sm font-medium mb-1 block">Search Address (Auto-fill)</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Type to search address..."
                                className="w-full border p-2 pl-9 rounded focus:outline-none focus:border-blue-500"
                                onChange={(e) => {
                                    if (e.target.value.length === 0) setSearchResults([]);
                                    // Simple debounce implementation
                                    const val = e.target.value;
                                    setTimeout(() => {
                                        if (val === e.target.value) handleAddressSearch(val);
                                    }, 800);
                                }}
                            />
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                            {searching && <Loader className="absolute right-3 top-2.5 text-blue-500 animate-spin" size={16} />}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                {searchResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectSearch(result)}
                                        className="p-2 hover:bg-gray-50 cursor-pointer text-sm border-b last:border-0"
                                    >
                                        {result.display_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                            <input required type="text" className="w-full border p-2 rounded"
                                value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Mobile No <span className="text-red-500">*</span></label>
                            <input required type="tel" className="w-full border p-2 rounded"
                                value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Alternate Mobile</label>
                            <input type="tel" className="w-full border p-2 rounded"
                                value={formData.alternate_mobile} onChange={e => setFormData({ ...formData, alternate_mobile: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Flat / House / Building <span className="text-red-500">*</span></label>
                            <input required type="text" className="w-full border p-2 rounded"
                                value={formData.flat_house} onChange={e => setFormData({ ...formData, flat_house: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="text-sm font-medium">Address Line</label>
                        <input required type="text" className="w-full border p-2 rounded"
                            value={formData.address_line1} onChange={e => setFormData({ ...formData, address_line1: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">City</label>
                        <input required type="text" className="w-full border p-2 rounded"
                            value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">State</label>
                        <input type="text" className="w-full border p-2 rounded"
                            value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Zip Code</label>
                        <input required type="text" className="w-full border p-2 rounded"
                            value={formData.zip_code} onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">Address Type</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="Home"
                                        checked={formData.type === "Home"}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Home</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="Office"
                                        checked={formData.type === "Office"}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-700">Office</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_default}
                                    onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-700">Make this my default address</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-end gap-3 col-span-2">
                        <button type="button" onClick={handleCancel} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition-colors">Cancel</button>
                        <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors">
                            {editingId ? "Update Address" : "Save Address"}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {addresses.length === 0 && !showForm && (
                    <p className="text-gray-500">No addresses found.</p>
                )}

                {addresses.map(addr => (
                    <div key={addr.id} className="border p-4 rounded-xl flex justify-between items-start bg-white hover:shadow-sm transition-shadow">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-800 text-lg">{addr.type || 'Home'}</span>
                                {addr.is_default && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
                            </div>
                            <div className="mb-2">
                                <p className="font-bold text-gray-900">{addr.full_name}</p>
                                <p className="text-sm text-gray-600 font-medium">{addr.mobile} {addr.alternate_mobile && <span className="text-gray-400">| {addr.alternate_mobile}</span>}</p>
                            </div>
                            <p className="text-sm text-gray-700 mb-1 font-medium">{addr.flat_house}, {addr.address_line1}</p>
                            <p className="text-sm text-gray-500">{addr.city}, {addr.state} - {addr.zip_code}</p>
                            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{addr.country}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <button
                                onClick={() => handleEdit(addr)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Address"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(addr.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Address"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </AccountLayout>
    );
};

export default Addresses;
