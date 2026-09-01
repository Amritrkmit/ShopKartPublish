import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Trash2, Plus, Sliders, ChevronRight } from 'lucide-react';
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerAttributeManager = () => {
    const { confirm } = useConfirmation();
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [attributes, setAttributes] = useState([]);

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
            let url = `${API_BASE_URL}/attributes?category_id=${selectedCategory}`;
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
        if (!newAttr.name || !selectedCategory) return toastError("Category and Name are required");

        const payload = {
            category_id: selectedCategory,
            subcategory_id: selectedSubcategory || null,
            name: newAttr.name,
            input_type: newAttr.input_type,
            required: newAttr.required,
            options: (newAttr.input_type === 'select' || newAttr.input_type === 'checkbox' || newAttr.input_type === 'radio') ? newAttr.options.split(',').map(s => s.trim()) : null
        };

        try {
            await axios.post(`${API_BASE_URL}/attributes/add`, payload);
            setNewAttr({ name: '', input_type: 'text', options: '', required: false });
            fetchAttributes();
            toastSuccess("Attribute added successfully");
        } catch (err) {
            console.error("Error adding attribute", err);
            toastError("Failed to add attribute");
        }
    };

    const handleDelete = async (id) => {
        confirm({
            title: "Delete Attribute?",
            message: "Are you sure you want to delete this attribute definition? This will affect all products using this attribute.",
            confirmText: "Delete Attribute",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/attributes/${id}`);
                    fetchAttributes();
                    toastSuccess("Attribute deleted");
                } catch (err) {
                    console.error("Error deleting attribute", err);
                    toastError("Failed to delete attribute");
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Main Menu</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Attribute Manager</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600 hidden md:block">
                        <Sliders size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Attribute Manager</h1>
                        <p className="text-sm text-gray-500 mt-1">Define custom fields (e.g. Material, Fabric, RAM) for specific categories to helps customers filter products.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. Selection & List */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">1. Select Category</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-sm"
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedSubcategory('');
                                    }}
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Subcategory (Optional)</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-sm disabled:opacity-50"
                                    value={selectedSubcategory}
                                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                                    disabled={!selectedCategory}
                                >
                                    <option value="">-- All Subcategories --</option>
                                    {(() => {
                                        const groups = subcategories.filter(s => !s.parent_id);
                                        return groups.map(group => {
                                            const children = subcategories.filter(s => s.parent_id === group.id);
                                            if (children.length === 0) {
                                                return <option key={group.id} value={group.id}>{group.name}</option>;
                                            }
                                            return (
                                                <optgroup key={group.id} label={group.name}>
                                                    {children.map(child => (
                                                        <option key={child.id} value={child.id}>
                                                            {child.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            );
                                        });
                                    })()}
                                </select>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                                Existing Attributes
                                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-full text-gray-600">{attributes.length} found</span>
                            </h3>

                            {attributes.length === 0 ? (
                                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                                    No attributes defined for this selection.
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {attributes.map(attr => (
                                        <li key={attr.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 text-sm">{attr.name}</span>
                                                    {attr.subcategory_id && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Subcat</span>}
                                                    {attr.required && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Req</span>}
                                                </div>
                                                <span className="text-xs text-gray-500 mt-0.5 block capitalize">{attr.input_type}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(attr.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete Attribute"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* 2. Add New Form */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit sticky top-24">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-2">2. Add New Attribute</h2>

                        {!selectedCategory ? (
                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-gray-500 text-sm px-4">👈 Please select a category on the left to add attributes.</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Attribute Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        placeholder="e.g. RAM, Screen Size, Fabric"
                                        value={newAttr.name}
                                        onChange={e => setNewAttr({ ...newAttr, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Input Type</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 text-sm"
                                        value={newAttr.input_type}
                                        onChange={e => setNewAttr({ ...newAttr, input_type: e.target.value })}
                                    >
                                        <option value="text">Text Input</option>
                                        <option value="number">Number Input</option>
                                        <option value="select">Dropdown Selection</option>
                                        <option value="checkbox">Checkbox List</option>
                                        <option value="radio">Radio Buttons</option>
                                    </select>
                                </div>

                                {(newAttr.input_type === 'select' || newAttr.input_type === 'checkbox' || newAttr.input_type === 'radio') && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="e.g. Small, Medium, Large"
                                            value={newAttr.options}
                                            onChange={e => setNewAttr({ ...newAttr, options: e.target.value })}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Separate multiple options with commas</p>
                                    </div>
                                )}

                                <div>
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            checked={newAttr.required}
                                            onChange={e => setNewAttr({ ...newAttr, required: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-gray-900">Mark as Mandatory</span>
                                    </label>
                                </div>

                                <button
                                    onClick={handleAddAttribute}
                                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-md"
                                >
                                    <Plus size={18} className="mr-2" /> Add Attribute
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerAttributeManager;
