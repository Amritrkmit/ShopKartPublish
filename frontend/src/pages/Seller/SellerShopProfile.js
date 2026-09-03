import React, { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Store, MapPin, Phone, Mail, Save, Upload, ChevronRight, Info } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerShopProfile = () => {
    const { seller, setSeller } = useOutletContext();
    const navigate = useNavigate();
    const [shop, setShop] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    useEffect(() => {
        fetchShopDetails();
    }, []);

    const fetchShopDetails = async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/seller/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShop(res.data || {});
            if (res.data.logo_url) {
                setLogoPreview(`${process.env.REACT_APP_API_BASE_URL || ""}${res.data.logo_url}`);
            }
        } catch (err) {
            console.error("Error fetching shop profile:", err);
            // If 404, it might be a new seller, so don't show error, just let them fill form
            if (err.response && err.response.status === 404) {
                return;
            }
            toastError("Failed to load shop details");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setShop(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem("sellerToken");
            const formData = new FormData();

            Object.keys(shop).forEach(key => {
                if (shop[key] !== null && shop[key] !== undefined) {
                    formData.append(key, shop[key]);
                }
            });

            if (logoFile) {
                formData.append("logo", logoFile);
            }

            await axios.put(`${API_BASE_URL}/seller/profile`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toastSuccess("Shop profile updated successfully!");
            if (logoFile) {
                const sellerRes = await axios.get(`${API_BASE_URL}/seller/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSeller(sellerRes.data);
            }
        } catch (err) {
            console.error("Update error:", err);
            toastError("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading store profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Main Menu</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Shop Profile</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/seller/dashboard/")}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Save size={18} />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Branding */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 mb-6 border-b pb-4">Store Branding</h3>
                            <div className="flex flex-col items-center">
                                <div className="relative group w-32 h-32 mb-4">
                                    <div className="w-full h-full rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center group-hover:border-blue-500 transition-colors">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Store size={40} className="text-gray-300" />
                                        )}
                                    </div>
                                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-2xl text-white">
                                        <Upload size={20} />
                                        <input type="file" className="hidden" onChange={handleLogoChange} accept="image/*" />
                                    </label>
                                </div>
                                <p className="text-xs font-bold text-gray-700">Official Shop Logo</p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">500x500 Transparent PNG preferred</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white rounded-lg p-6 shadow-lg shadow-gray-200">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Contact Sync</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-blue-400">
                                        <Mail size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Support Email</p>
                                        <p className="text-xs font-medium">{seller?.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-green-400">
                                        <Phone size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-medium">{seller?.phone || 'Not verified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b">
                                <h3 className="text-base font-semibold text-gray-900">General Information</h3>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${shop?.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {shop?.is_active ? 'Store Active' : 'Maintenance Mode'}
                                </span>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Official Shop Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" name="name" value={shop?.name || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-gray-900"
                                        placeholder="e.g. Modern Fashion Hub"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Shop Description</label>
                                    <textarea
                                        name="description" value={shop?.description || ''}
                                        onChange={handleInputChange} rows="5"
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                                        placeholder="Describe what makes your store unique..."
                                    />
                                </div>

                                <div className="pt-6 border-t">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Fulfillment Location</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Warehouse / Street Address</label>
                                            <div className="relative">
                                                <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                                                <input
                                                    type="text" name="address_line1" value={shop?.address_line1 || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Building, Street, Area"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">City</label>
                                            <input
                                                type="text" name="city" value={shop?.city || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Zip / Pincode</label>
                                            <input
                                                type="text" name="pincode" value={shop?.pincode || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-100 mt-8">
                                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                                        Your shop location determines shipping rates and tax calculations. Ensure this address matches your business registration.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerShopProfile;
