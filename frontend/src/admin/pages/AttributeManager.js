import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Trash2, Plus, Sliders, Settings, List, Type, CheckSquare, ChevronDown, Monitor } from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/toast';
import ConfirmationModal from '../../components/ConfirmationModal';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AttributeManager = () => {
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [attributes, setAttributes] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');

    const [newAttr, setNewAttr] = useState({
        name: '',
        input_type: 'text',
        options: '', // comma separated for input
        required: false
    });

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/category`);
            setCategories(res.data);
        } catch (err) {
            console.error("Error fetching categories", err);
        }
    }, []);

    const fetchSubcategories = useCallback(async (catId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/subcategory?category_id=${catId}`);
            setSubcategories(res.data);
        } catch (err) {
            console.error("Error fetching subcategories", err);
        }
    }, []);

    const fetchAttributes = useCallback(async () => {
        try {
            let url = `${API_BASE_URL}/api/attributes?category_id=${selectedCategory}`;
            if (selectedSubcategory) {
                url += `&subcategory_id=${selectedSubcategory}`;
            }
            const res = await axios.get(url);
            setAttributes(res.data);
        } catch (err) {
            console.error("Error fetching attributes", err);
        }
    }, [selectedCategory, selectedSubcategory]);

    // Load initial data
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Load attributes when selection changes
    useEffect(() => {
        if (selectedCategory) {
            fetchSubcategories(selectedCategory);
            fetchAttributes();
        } else {
            setAttributes([]);
            setSubcategories([]);
        }
    }, [selectedCategory, fetchSubcategories, fetchAttributes]);

    const handleAddAttribute = async () => {
        if (!newAttr.name || !selectedCategory) {
            toastError("Category and Name are required");
            return;
        }

        const payload = {
            category_id: selectedCategory,
            subcategory_id: selectedSubcategory || null,
            name: newAttr.name,
            input_type: newAttr.input_type,
            required: newAttr.required,
            options: (newAttr.input_type === 'select' || newAttr.input_type === 'checkbox' || newAttr.input_type === 'radio') ? newAttr.options.split(',').map(s => s.trim()) : null
        };

        try {
            await axios.post(`${API_BASE_URL}/api/attributes/add`, payload);
            setNewAttr({ name: '', input_type: 'text', options: '', required: false });
            fetchAttributes();
            toastSuccess("Attribute added successfully");
        } catch (err) {
            console.error("Error adding attribute", err);
            toastError("Failed to add attribute");
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/attributes/${id}`);
            fetchAttributes();
        } catch (err) {
            console.error("Error deleting attribute", err);
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    // Helper to get input icon
    const getInputIcon = (type) => {
        switch (type) {
            case 'select': return <List size={14} className="text-purple-600" />;
            case 'checkbox': return <CheckSquare size={14} className="text-green-600" />;
            case 'number': return <Type size={14} className="text-blue-600" />;
            default: return <Type size={14} className="text-gray-600" />;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                    <Sliders className="text-blue-600" size={28} />
                    Attribute Manager
                </h1>
                <p className="text-gray-500 mt-2 text-sm ml-10">
                    Configure specifications and filters for products based on their categories.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Filters & List */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Filter Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                                <div className="relative">
                                    <select
                                        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all cursor-pointer"
                                        value={selectedCategory}
                                        onChange={(e) => {
                                            setSelectedCategory(e.target.value);
                                            setSelectedSubcategory('');
                                        }}
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subcategory (Optional)</label>
                                <div className="relative">
                                    <select
                                        className={`w-full pl-3 pr-10 py-2.5 border rounded-lg text-sm font-medium appearance-none transition-all ${!selectedCategory
                                            ? 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-50 border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'
                                            }`}
                                        value={selectedSubcategory}
                                        onChange={(e) => setSelectedSubcategory(e.target.value)}
                                        disabled={!selectedCategory}
                                    >
                                        <option value="">All Subcategories</option>
                                        {(() => {
                                            const groups = subcategories.filter(s => !s.parent_id);
                                            return groups.map(group => {
                                                const children = subcategories.filter(s => s.parent_id === group.id);
                                                if (children.length === 0) {
                                                    return <option key={group.id} value={group.id}>{group.name}</option>;
                                                }
                                                return (
                                                    <optgroup key={group.id} label={group.name} className="font-bold">
                                                        {children.map(child => (
                                                            <option key={child.id} value={child.id} className="font-normal">
                                                                {child.name}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            });
                                        })()}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <List size={18} className="text-gray-500" />
                                Existing Attributes
                            </h2>
                            <span className="text-xs font-medium px-2 py-1 bg-gray-200 text-gray-600 rounded-full">{attributes.length} items</span>
                        </div>

                        {!selectedCategory ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="bg-blue-50 p-4 rounded-full mb-4">
                                    <Settings size={32} className="text-blue-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Category Selected</h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-sm">Please select a category from the filters above to view and manage its attributes.</p>
                            </div>
                        ) : attributes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                    <List size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Attributes Found</h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-sm">No specific attributes have been defined for this selection yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {attributes.map(attr => (
                                    <div key={attr.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start group">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-gray-900">{attr.name}</h3>
                                                {attr.required && (
                                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">REQUIRED</span>
                                                )}
                                                {attr.subcategory_id && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">SUB-CAT ONLY</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded">
                                                    {getInputIcon(attr.input_type)}
                                                    <span className="font-medium uppercase">{attr.input_type}</span>
                                                </div>
                                                {attr.options && attr.options.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-medium text-gray-400">Options:</span>
                                                        <span className="text-gray-700 truncate max-w-[250px]">{attr.options.join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(attr.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Attribute"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Add New Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6">
                        <div className="p-5 border-b border-gray-100 bg-blue-50/50 rounded-t-xl">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Plus size={18} className="text-blue-600" />
                                Add New Attribute
                            </h2>
                        </div>

                        <div className="p-5 space-y-5">
                            {!selectedCategory ? (
                                <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <Monitor size={24} className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Select a category on the left to add attributes.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Attribute Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                            placeholder="e.g. Screen Size, Material"
                                            value={newAttr.name}
                                            onChange={e => setNewAttr({ ...newAttr, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Input Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['text', 'number', 'select', 'checkbox'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setNewAttr({ ...newAttr, input_type: type })}
                                                    className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-2 transition-all ${newAttr.input_type === type
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {getInputIcon(type)}
                                                    <span className="capitalize">{type}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(newAttr.input_type === 'select' || newAttr.input_type === 'checkbox') && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Options</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                                placeholder="e.g. Small, Medium, Large (comma separated)"
                                                value={newAttr.options}
                                                onChange={e => setNewAttr({ ...newAttr, options: e.target.value })}
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Separate options with commas.</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="text-sm font-medium text-gray-700 cursor-pointer select-none" htmlFor="req-check">
                                            Mandatory Field?
                                        </label>
                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                name="toggle"
                                                id="req-check"
                                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-blue-600"
                                                checked={newAttr.required}
                                                onChange={e => setNewAttr({ ...newAttr, required: e.target.checked })}
                                                style={{ right: newAttr.required ? '0' : 'auto', left: newAttr.required ? 'auto' : '0' }}
                                            />
                                            <label htmlFor="req-check" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${newAttr.required ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddAttribute}
                                        className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow-lg shadow-gray-200 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Add Attribute
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Attribute?"
                message="Are you sure you want to delete this attribute? This might affect existing products using this attribute."
                confirmText="Delete Attribute"
                isDelete={true}
            />
        </div>
    );
};

export default AttributeManager;
