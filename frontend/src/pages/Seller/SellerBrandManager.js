import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus, Search, Tag, ChevronRight } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SellerBrandManager = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBrand, setNewBrand] = useState({ name: "", description: "" });

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/api/brands/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBrands(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch brands", err);
            toastError("Failed to fetch brands");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newBrand.name.trim()) return toastError("Brand name is required");

        try {
            const token = localStorage.getItem("sellerToken");
            const headers = { Authorization: `Bearer ${token}` };

            await axios.post(`${API_BASE_URL}/api/brands`, newBrand, { headers });
            toastSuccess("Brand added successfully");

            setNewBrand({ name: "", description: "" });
            setShowAddForm(false);
            fetchBrands();
        } catch (err) {
            toastError(err.response?.data?.message || "Operation failed");
        }
    };

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Main Menu</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Brands</span>
                        </div>
                        <button
                            onClick={() => {
                                setShowAddForm(!showAddForm);
                                setNewBrand({ name: "", description: "" });
                            }}
                            className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={16} /> {showAddForm ? "Cancel" : "Add Brand"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600 hidden md:block">
                        <Tag size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Brand Manager</h1>
                        <p className="text-sm text-gray-500 mt-1">Request to add brands to the global directory.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Brand List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Search */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search brands..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Name</th>
                                            <th className="px-6 py-3 font-medium uppercase tracking-wider text-xs">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan="2" className="px-6 py-8 text-center text-gray-500">Loading brands...</td></tr>
                                        ) : filteredBrands.length === 0 ? (
                                            <tr><td colSpan="2" className="px-6 py-8 text-center text-gray-500">No brands found.</td></tr>
                                        ) : (
                                            filteredBrands.map(brand => (
                                                <tr key={brand.id} className="group hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{brand.name}</td>
                                                    <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{brand.description || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Add Form Sidebar */}
                    {showAddForm && (
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-24 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="mb-4 pb-2 border-b border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-900">Add New Brand</h3>
                                    <p className="text-xs text-gray-500 mt-1">New brands will be reviewed by administrators.</p>
                                </div>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Brand Name</label>
                                        <input
                                            type="text"
                                            value={newBrand.name}
                                            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="e.g. Nike, Samsung"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                                        <textarea
                                            value={newBrand.description}
                                            onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                            rows="4"
                                            placeholder="Optional description..."
                                        />
                                    </div>

                                    <div className="pt-2 flex flex-col gap-2">
                                        <button
                                            type="submit"
                                            className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow"
                                        >
                                            Create Brand
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="w-full py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerBrandManager;
