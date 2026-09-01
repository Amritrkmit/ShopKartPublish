import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toastSuccess, toastError, axiosErrorMessage } from '../../utils/toast';
import { Users, Plus, Trash2, Clock, Tag, Search, X, TrendingDown, CheckCircle, Edit } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const GroupBuyManager = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDeal, setEditingDeal] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    // Form state
    const [formData, setFormData] = useState({
        product_id: '',
        target_count: 5,
        discount_percentage: 10,
        duration_hours: 24
    });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const fetchDeals = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/group-buys/admin/all`, { withCredentials: true });
            setDeals(res.data);
            setLoading(false);
        } catch (err) {
            toastError("Failed to fetch group deals");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    const handleSearch = async (query) => {
        setProductSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/search/by-name?q=${query}`);
            setSearchResults(res.data.products || []);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setSearching(false);
        }
    };

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setFormData({ ...formData, product_id: product.id });
        setProductSearch("");
        setSearchResults([]);
    };

    const handleEditClick = (deal) => {
        setEditingDeal(deal);
        setFormData({
            product_id: deal.product_id,
            target_count: deal.target_count,
            discount_percentage: deal.discount_percentage,
            duration_hours: 0 // Duration is tricky to edit if already running, we can treat 0 as "no change" or allow extend
        });
        setSelectedProduct({
            id: deal.product_id,
            name: deal.product_name,
            image: deal.product_image,
            sale_price: deal.product_sale_price
        });
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/group-buys/admin/${id}`, { withCredentials: true });
            toastSuccess("Group deal deleted");
            fetchDeals();
        } catch (err) {
            toastError("Failed to delete deal");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product_id) return toastError("Please select a product");

        try {
            if (editingDeal) {
                await axios.put(`${API_BASE_URL}/api/group-buys/admin/${editingDeal.id}`, formData, { withCredentials: true });
                toastSuccess("Group Deal Updated!");
            } else {
                await axios.post(`${API_BASE_URL}/api/group-buys/create`, formData, { withCredentials: true });
                toastSuccess("Group Deal Created Successfully!");
            }
            setShowForm(false);
            setEditingDeal(null);
            setFormData({ product_id: '', target_count: 5, discount_percentage: 10, duration_hours: 24 });
            setSelectedProduct(null);
            fetchDeals();
        } catch (err) {
            toastError(axiosErrorMessage(err, editingDeal ? "Failed to update deal" : "Failed to create deal"));
        }
    };

    const getStatusBadge = (deal) => {
        const isExpired = new Date(deal.end_time) < new Date() && deal.status === 'active';
        if (deal.status === 'completed') return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10} /> Completed</span>;
        if (isExpired) return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={10} /> Expired</span>;
        return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 animate-pulse"><TrendingDown size={10} /> Live</span>;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white">
                            <Users size={24} />
                        </div>
                        Group Deal Manager
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Boost sales with time-limited community discount goals</p>
                </div>
                <button
                    onClick={() => {
                        setEditingDeal(null);
                        setFormData({ product_id: '', target_count: 5, discount_percentage: 10, duration_hours: 24 });
                        setSelectedProduct(null);
                        setShowForm(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                >
                    <Plus size={20} /> Launch New Deal
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 text-slate-400">
                    <Clock className="animate-spin mr-2" /> Loading deals...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deals.map(deal => {
                        const progress = Math.min((deal.current_count / deal.target_count) * 100, 100);
                        return (
                            <div key={deal.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
                                <div className="absolute top-3 right-3 z-10">
                                    {getStatusBadge(deal)}
                                </div>

                                <div className="p-4 flex gap-4 border-b border-slate-50">
                                    <div className="w-20 h-20 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 p-1">
                                        <img
                                            src={deal.product_image?.startsWith('http') ? deal.product_image : `${API_BASE_URL}${deal.product_image}`}
                                            alt=""
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0 pr-12">
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{deal.product_name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-indigo-600 font-black text-lg">-{deal.discount_percentage}%</span>
                                            <span className="text-slate-400 line-through text-xs">₹{deal.product_sale_price}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Users size={16} className="text-slate-400" />
                                            <span className="text-sm font-bold">{deal.current_count} <span className="font-normal text-slate-400">of {deal.target_count} Joined</span></span>
                                        </div>
                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">{Math.round(progress)}% Goal</span>
                                    </div>

                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6">
                                        <div
                                            className={`h-full transition-all duration-1000 ${deal.status === 'completed' ? 'bg-green-500' : 'bg-indigo-600'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ends On</span>
                                            <span className="text-xs font-bold text-slate-700">{new Date(deal.end_time).toLocaleDateString()} {new Date(deal.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditClick(deal)}
                                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Edit Deal"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(deal.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Deal"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {deals.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                            <Users size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No active or past deals</h3>
                            <p className="text-slate-500">Launch a new group deal to start driving community traffic</p>
                        </div>
                    )}
                </div>
            )}

            {/* Creation Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingDeal ? "Edit Group Deal" : "Launch Group Deal"}</h3>
                                <p className="text-xs text-indigo-600 font-bold">{editingDeal ? `Editing deal for ${editingDeal.product_name}` : "Configure your community discount campaign"}</p>
                            </div>
                            <button onClick={() => { setShowForm(false); setEditingDeal(null); }} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Product Selector */}
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">1. Select Product</label>
                                {selectedProduct ? (
                                    <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl relative">
                                        <img
                                            src={selectedProduct.image?.startsWith('http') ? selectedProduct.image : `${API_BASE_URL}${selectedProduct.image}`}
                                            alt=""
                                            className="w-12 h-12 object-contain bg-white rounded-xl border border-indigo-50"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 truncate pr-6">{selectedProduct.name}</p>
                                            <p className="text-xs text-slate-500 font-medium">Price: ₹{selectedProduct.sale_price}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProduct(null)}
                                            className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative group">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search by product name..."
                                                value={productSearch}
                                                onChange={e => handleSearch(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                                            />
                                        </div>
                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto overflow-x-hidden">
                                                {searchResults.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => selectProduct(p)}
                                                        className="flex items-center gap-4 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                    >
                                                        <img
                                                            src={p.image?.startsWith('http') ? p.image : `${API_BASE_URL}${p.image}`}
                                                            alt=""
                                                            className="w-10 h-10 object-contain bg-slate-50 rounded-lg group-hover:scale-110 transition-transform"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                                                            <p className="text-[10px] text-indigo-600 font-black">₹{p.sale_price}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searching && <div className="absolute right-4 top-[3.25rem]"><div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" /></div>}
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">2. Members Goal</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={formData.target_count}
                                            onChange={e => setFormData({ ...formData, target_count: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Users needed to join</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">3. Discount %</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="99"
                                            value={formData.discount_percentage}
                                            onChange={e => setFormData({ ...formData, discount_percentage: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-600 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">Extra off on success</p>
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2 text-amber-800">
                                    <Clock size={16} />
                                    <label className="text-[10px] font-black uppercase tracking-widest">{editingDeal ? "4. Extend Duration (Hours)" : "4. Duration (Hours)"}</label>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="168"
                                    step="1"
                                    value={formData.duration_hours}
                                    onChange={e => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-amber-200 rounded-lg cursor-pointer accent-amber-600 mt-2"
                                />
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] font-bold text-amber-600">{editingDeal ? "No Change" : "1 Hour"}</span>
                                    <span className="text-sm font-black text-amber-800 uppercase px-2 py-0.5 bg-white rounded-md shadow-sm border border-amber-100">
                                        {formData.duration_hours === 0 && editingDeal ? "Keep Current" : `${formData.duration_hours} Hours`}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-600">7 Days</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 hover:shadow-none translate-y-0 active:translate-y-1"
                            >
                                {editingDeal ? "Update Group Deal" : "Activate Live Deal"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Group Deal?"
                message="Are you sure you want to delete this group deal? All participation data will be lost and this action cannot be undone."
                confirmText="Delete Deal"
                isDelete={true}
            />
        </div>
    );
};

export default GroupBuyManager;
