import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const BrandList = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { confirm } = useConfirmation();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [newBrand, setNewBrand] = useState({ name: "", description: "" });

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/brands/all`, {
                withCredentials: true
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

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!newBrand.name.trim()) return toastError("Brand name is required");

        try {
            if (editingBrand) {
                await axios.put(`${API_BASE_URL}/api/brands/${editingBrand.id}`, newBrand, { withCredentials: true });
                toastSuccess("Brand updated successfully");
            } else {
                await axios.post(`${API_BASE_URL}/api/brands`, newBrand, { withCredentials: true });
                toastSuccess("Brand added successfully");
            }
            setNewBrand({ name: "", description: "" });
            setEditingBrand(null);
            setShowAddForm(false);
            fetchBrands();
        } catch (err) {
            toastError(err.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: "Delete Brand?",
            message: "Are you sure you want to delete this brand? This action cannot be undone.",
            confirmText: "Delete Brand",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/api/brands/${id}`, { withCredentials: true });
                    toastSuccess("Brand deleted");
                    fetchBrands();
                } catch (err) {
                    toastError("Failed to delete brand");
                }
            }
        });
    };

    const filteredBrands = brands.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Brands</h1>
                <button
                    onClick={() => {
                        setShowAddForm(!showAddForm);
                        setEditingBrand(null);
                        setNewBrand({ name: "", description: "" });
                    }}
                    className="bg-[#dc3545] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                >
                    <Plus size={18} /> {showAddForm ? "Cancel" : "Add Brand"}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">{editingBrand ? "Edit Brand" : "Add New Brand"}</h3>
                    <form onSubmit={handleAddOrUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                            <input
                                type="text"
                                value={newBrand.name}
                                onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Sony"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={newBrand.description}
                                onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                rows="3"
                                placeholder="Short description..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                {editingBrand ? "Update" : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search brands..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="3" className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : filteredBrands.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No brands found</td></tr>
                            ) : (
                                filteredBrands.map(brand => (
                                    <tr key={brand.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{brand.uid || `ID: ${brand.id}`}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{brand.description || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button
                                                onClick={() => {
                                                    setEditingBrand(brand);
                                                    setNewBrand({ name: brand.name, description: brand.description || "" });
                                                    setShowAddForm(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(brand.id)} className="text-red-600 hover:text-red-900">
                                                <Trash2 size={18} />
                                            </button>
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

export default BrandList;
