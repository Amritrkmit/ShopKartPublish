import { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";
import { Tag, Package, Truck, Globe, Sliders, Lock, ChevronRight, Info, X, Plus, Trash2, Settings, Type, List, CheckSquare } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const InventorySection = ({ formData, handleChange, setFormData, errors = {}, attributes = [], handleAttributeCheckbox, fetchAttributes }) => {
    const { confirm } = useConfirmation();
    const [technicalMode, setTechnicalMode] = useState(false);
    const [showAddAttributeModal, setShowAddAttributeModal] = useState(false);
    const [newAttr, setNewAttr] = useState({
        name: '',
        input_type: 'text',
        options: '',
        required: false
    });
    const [isSavingAttr, setIsSavingAttr] = useState(false);

    const pd = (() => {
        try {
            return typeof formData.payment_details === 'string'
                ? (formData.payment_details ? JSON.parse(formData.payment_details) : {})
                : (formData.payment_details || {});
        } catch (e) {
            console.error("Payment details parse error", e);
            return {};
        }
    })();

    const handlePDChange = (newPd) => {
        setFormData(prev => ({ ...prev, payment_details: JSON.stringify(newPd, null, 2) }));
    };

    const handleCreateAttribute = async () => {
        if (!formData.category_id) {
            toastError("Please select a Category first.");
            return;
        }
        if (!newAttr.name) {
            toastError("Attribute Name is required.");
            return;
        }

        setIsSavingAttr(true);
        try {
            const payload = {
                category_id: formData.category_id,
                subcategory_id: formData.subcategory_id || null,
                name: newAttr.name,
                input_type: newAttr.input_type,
                required: newAttr.required,
                options: (newAttr.input_type === 'select' || newAttr.input_type === 'checkbox') ? newAttr.options.split(',').map(s => s.trim()) : null
            };

            await axios.post(`${API_BASE_URL}/api/attributes/add`, payload);
            toastSuccess("Attribute added to category");

            // Refresh attributes
            if (fetchAttributes) {
                await fetchAttributes(formData.category_id, formData.subcategory_id);
            }

            // Close and reset
            setShowAddAttributeModal(false);
            setNewAttr({ name: '', input_type: 'text', options: '', required: false });

        } catch (err) {
            console.error("Error creating attribute", err);
            toastError("Failed to create attribute. Please try again.");
        } finally {
            setIsSavingAttr(false);
        }
    };

    const handleDeleteAttribute = async (attrId) => {
        confirm({
            title: "Delete Attribute?",
            message: "Are you sure you want to delete this attribute definition from the category? This will affect all products in this category.",
            confirmText: "Delete Attribute",
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/api/attributes/${attrId}`);
                    if (fetchAttributes) {
                        await fetchAttributes(formData.category_id, formData.subcategory_id);
                    }
                    toastSuccess("Attribute definition removed from category");
                } catch (err) {
                    console.error("Error deleting attribute", err);
                    toastError("Failed to delete attribute definition");
                }
            }
        });
    };

    return (
        <div className="space-y-6">

            {/* Add Attribute Modal */}
            {showAddAttributeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Add New Attribute</h3>
                                <p className="!text-sm text-gray-500">Define a new field for this category.</p>
                            </div>
                            <button onClick={() => setShowAddAttributeModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block !text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attribute Name</label>
                                <input
                                    type="text"
                                    value={newAttr.name}
                                    onChange={(e) => setNewAttr(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 !text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                    placeholder="e.g. Screen Size, Material"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block !text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Input Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewAttr(prev => ({ ...prev, input_type: 'text' }))}
                                        className={`px-4 py-3 !text-sm font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${newAttr.input_type === 'text' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <Type size={16} /> Text
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAttr(prev => ({ ...prev, input_type: 'number' }))}
                                        className={`px-4 py-3 !text-sm font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${newAttr.input_type === 'number' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <Type size={16} /> Number
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAttr(prev => ({ ...prev, input_type: 'select' }))}
                                        className={`px-4 py-3 !text-sm font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${newAttr.input_type === 'select' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <List size={16} /> Select
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewAttr(prev => ({ ...prev, input_type: 'checkbox' }))}
                                        className={`px-4 py-3 !text-sm font-medium rounded-xl border flex items-center justify-center gap-2 transition-all ${newAttr.input_type === 'checkbox' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <CheckSquare size={16} /> Checkbox
                                    </button>
                                </div>
                            </div>

                            {(newAttr.input_type === 'select' || newAttr.input_type === 'checkbox') && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="block !text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Options</label>
                                    <input
                                        type="text"
                                        value={newAttr.options}
                                        onChange={(e) => setNewAttr(prev => ({ ...prev, options: e.target.value }))}
                                        className="w-full px-4 py-3 !text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                        placeholder="Option A, Option B, Option C"
                                    />
                                    <p className="!text-xs text-gray-400 mt-2">Separate multiple options with commas.</p>
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                <label className="!text-sm font-bold text-gray-700">Mandatory Field?</label>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="toggle"
                                        id="modal-req-check"
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-blue-600"
                                        checked={newAttr.required}
                                        onChange={(e) => setNewAttr(prev => ({ ...prev, required: e.target.checked }))}
                                        style={{ right: newAttr.required ? '0' : 'auto', left: newAttr.required ? 'auto' : '0' }}
                                    />
                                    <label htmlFor="modal-req-check" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${newAttr.required ? 'bg-blue-600' : 'bg-gray-300'}`}></label>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateAttribute}
                                disabled={isSavingAttr}
                                className="w-full py-4 bg-gray-900 hover:bg-black text-white !text-sm font-bold rounded-xl shadow-lg shadow-gray-200 transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSavingAttr ? (
                                    <span className="animate-pulse">Saving...</span>
                                ) : (
                                    <>
                                        <Plus size={18} /> Add Attribute
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Pricing Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Tag size={18} className="text-blue-600" /> Pricing</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">
                                Regular price
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-sm">₹</span>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price || ""}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    data-error={!!errors.price}
                                    className={`w-full pl-8 pr-3 py-2 !text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                                />
                            </div>
                            {errors.price && (
                                <p className="mt-1 !text-xs text-red-600 flex items-center gap-1">
                                    {errors.price}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">Sale price</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-sm">₹</span>
                                <input
                                    type="number"
                                    name="sale_price"
                                    value={formData.sale_price || ""}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className="w-full pl-8 pr-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Restock Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-600" /> Restock</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">SKU</label>
                            <input type="text" name="sku" value={formData.sku || ""} onChange={handleChange} placeholder="SKU-001" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">Barcode</label>
                            <input type="text" name="barcode" value={formData.barcode || ""} onChange={handleChange} placeholder="123456789" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block !text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                        <input type="number" name="stock" value={formData.stock || 0} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block !text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                        <select name="stock_status" value={formData.stock_status} onChange={handleChange} className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="in_stock">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="on_backorder">On Backorder</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" name="track_inventory" checked={formData.track_inventory} onChange={(e) => setFormData((prev) => ({ ...prev, track_inventory: e.target.checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <label className="ml-2 !text-sm text-gray-700">Track inventory for this product</label>
                    </div>
                </div>
            </div>

            {/* Shipping Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Truck size={18} className="text-blue-600" /> Shipping</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block !text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                        <input type="number" step="0.01" name="weight" value={formData.weight || ""} onChange={handleChange} placeholder="0.00" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block !text-sm font-medium text-gray-700 mb-2">Dimensions (L x W x H cm)</label>
                        <input type="text" name="dimensions" value={formData.dimensions || ""} onChange={handleChange} placeholder="10 x 10 x 10" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block !text-sm font-medium text-gray-700 mb-2">Shipping Class</label>
                        <select name="shipping_class" value={formData.shipping_class} onChange={handleChange} className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="standard">Standard</option>
                            <option value="express">Express</option>
                            <option value="free">Free Shipping</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Attributes Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-visible">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h3 className="!text-sm font-bold text-gray-900">Product Attributes</h3>
                            <p className="!text-xs text-gray-500">Define characteristics like color, size, and material.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href="/admin/attributes"
                            target="_blank"
                            className="!text-xs text-gray-600 hover:text-blue-600 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 flex items-center gap-1.5"
                        >
                            <Settings size={14} /> Configure Category
                        </a>
                        <button
                            type="button"
                            onClick={() => setShowAddAttributeModal(true)}
                            className="!text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-blue-200 transition-all flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Add New Attribute
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Pre-defined Attributes */}
                    {attributes && attributes.length > 0 && (
                        <div className="space-y-4">
                            <label className="!text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Category Standard</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attributes.map((attr) => (
                                    <div key={attr.id} className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 transition-all hover:border-gray-300 hover:bg-white group">
                                        <label className="block !text-xs font-bold text-gray-700 mb-2 flex items-center justify-between group-hover:text-blue-600 transition-colors">
                                            <div className="flex items-center gap-2">
                                                {attr.name}
                                                {attr.required && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 font-extrabold">REQ</span>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAttribute(attr.id)}
                                                className="text-gray-800 hover:text-red-600 transition-all opacity-1 group-hover:opacity-100 p-1 hover:bg-red-50 rounded"
                                                title="Delete attribute from category"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </label>

                                        {attr.input_type === 'select' ? (
                                            <div className="relative">
                                                <select
                                                    name={`attr_${attr.name}`}
                                                    value={formData.attributes?.[attr.name] || ""}
                                                    onChange={(e) => handleChange(e)}
                                                    className="w-full pl-3 pr-8 py-2 !text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer text-gray-700 font-medium"
                                                >
                                                    <option value="">Select {attr.name}...</option>
                                                    {attr.options && attr.options.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={14} />
                                            </div>
                                        ) : (attr.input_type === 'checkbox' && attr.options && attr.options.length > 0) ? (
                                            <div className="flex flex-wrap gap-2">
                                                {attr.options.map(opt => {
                                                    const isChecked = Array.isArray(formData.attributes?.[attr.name]) && formData.attributes[attr.name].includes(opt);
                                                    return (
                                                        <label key={opt} className={`inline-flex items-center cursor-pointer px-3 py-1.5 rounded-lg border transition-all select-none ${isChecked ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                                            <input
                                                                type="checkbox"
                                                                value={opt}
                                                                checked={isChecked}
                                                                onChange={(e) => handleAttributeCheckbox(attr.name, opt, e.target.checked)}
                                                                className="hidden"
                                                            />
                                                            <span className="!text-xs font-bold">{opt}</span>
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <input
                                                type={attr.input_type || 'text'}
                                                name={`attr_${attr.name}`}
                                                value={formData.attributes?.[attr.name] || ""}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 !text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                placeholder={`Enter ${attr.name}`}
                                                required={attr.required}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Attributes Render */}
                    {Object.keys(formData.attributes || {}).some(key => !attributes.some(a => a.name === key)) && (
                        <div className="space-y-4 pt-2">
                            <label className="!text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">Additional Custom</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(formData.attributes || {}).map(([key, val], idx) => {
                                    // Skip if this key is already in the pre-defined attributes
                                    if (attributes && attributes.some(attr => attr.name === key)) return null;

                                    return (
                                        <div key={idx} className="flex gap-4 items-start bg-white p-2 pl-4 pr-2 rounded-xl border border-gray-200 shadow-sm group hover:border-blue-200 transition-colors">
                                            <div className="w-1/3 pt-1">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Attribute Name</label>
                                                <input
                                                    value={key}
                                                    onChange={(e) => {
                                                        const newKey = e.target.value;
                                                        const newAttrs = { ...(formData.attributes || {}) };
                                                        const content = newAttrs[key];
                                                        delete newAttrs[key];
                                                        newAttrs[newKey] = content;
                                                        setFormData(prev => ({ ...prev, attributes: newAttrs }));
                                                    }}
                                                    className="w-full px-0 py-1 !text-sm border-none border-b-2 border-transparent focus:border-blue-500 focus:ring-0 font-bold text-gray-900 bg-transparent placeholder:text-gray-300 transition-all"
                                                    placeholder="Attr Name"
                                                />
                                            </div>
                                            <div className="w-px h-10 bg-gray-100 mx-2 self-center"></div>
                                            <div className="flex-1 pt-1">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Value</label>
                                                <input
                                                    value={val}
                                                    onChange={(e) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            attributes: { ...(prev.attributes || {}), [key]: e.target.value }
                                                        }));
                                                    }}
                                                    className="w-full px-3 py-1.5 !text-sm bg-gray-50 border border-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-800"
                                                    placeholder="Enter value..."
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newAttrs = { ...(formData.attributes || {}) };
                                                    delete newAttrs[key];
                                                    setFormData(prev => ({ ...prev, attributes: newAttrs }));
                                                }}
                                                className="p-2 mt-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(!attributes || attributes.length === 0) && !Object.keys(formData.attributes || {}).some(key => !attributes?.some(a => a.name === key)) && (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Sliders size={24} className="mx-auto text-gray-300 mb-2" />
                            <p className="!text-sm font-medium text-gray-500">No attributes found for this category.</p>
                            <p className="!text-xs text-gray-400 mt-1">Start by adding a new attribute definition.</p>
                            <button
                                type="button"
                                onClick={() => setShowAddAttributeModal(true)}
                                className="mt-4 !text-xs text-blue-600 font-bold hover:underline"
                            >
                                + Add New Attribute
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Details Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Info size={18} className="text-blue-600" /> Product Details (Offers, Payment & Warranty)</h3>
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Highlights */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="!text-xs font-semibold text-gray-700 uppercase tracking-wider">Highlights</label>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, highlights: [...(prev.highlights || []), ""] }))} className="!text-xs text-blue-600 font-bold hover:underline">+ Add</button>
                        </div>
                        <div className="space-y-2">
                            {(formData.highlights || []).map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={item}
                                        onChange={(e) => {
                                            const newHighlights = [...(formData.highlights || [])];
                                            newHighlights[idx] = e.target.value;
                                            setFormData(prev => ({ ...prev, highlights: newHighlights }));
                                        }}
                                        className="flex-1 px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. 1 Year Warranty"
                                    />
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, highlights: (prev.highlights || []).filter((_, i) => i !== idx) }))} className="text-red-500 mb-0.5"><X size={16} /></button>
                                </div>
                            ))}
                            {(!formData.highlights || formData.highlights.length === 0) && <p className="!text-xs text-gray-400 italic">No highlights added.</p>}
                        </div>
                    </div>

                    {/* Available Offers */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="!text-xs font-semibold text-gray-700 uppercase tracking-wider">Available Offers</label>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, offers: [...(prev.offers || []), { text: "", tc: "" }] }))} className="!text-xs text-blue-600 font-bold hover:underline">+ Add Offer</button>
                        </div>
                        <div className="space-y-4">
                            {(formData.offers || []).map((item, idx) => {
                                const offerObj = typeof item === 'string' ? { text: item, tc: "" } : item;
                                return (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2 relative group">
                                        <div className="flex gap-2">
                                            <div className="bg-green-100 text-green-700 p-1.5 rounded-md flex-shrink-0">
                                                <Tag size={14} />
                                            </div>
                                            <input
                                                value={offerObj.text || ""}
                                                onChange={(e) => {
                                                    const newOffers = [...(formData.offers || [])];
                                                    if (typeof item === 'string') {
                                                        newOffers[idx] = { text: e.target.value, tc: "" };
                                                    } else {
                                                        newOffers[idx] = { ...item, text: e.target.value };
                                                    }
                                                    setFormData(prev => ({ ...prev, offers: newOffers }));
                                                }}
                                                className="flex-1 px-3 py-1.5 !text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                                                placeholder="Offer Title (e.g. 10% instant discount...)"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, offers: (prev.offers || []).filter((_, i) => i !== idx) }))}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <textarea
                                            value={offerObj.tc || ""}
                                            onChange={(e) => {
                                                const newOffers = [...(formData.offers || [])];
                                                if (typeof item === 'string') {
                                                    newOffers[idx] = { text: item, tc: e.target.value };
                                                } else {
                                                    newOffers[idx] = { ...item, tc: e.target.value };
                                                }
                                                setFormData(prev => ({ ...prev, offers: newOffers }));
                                            }}
                                            className="w-full px-3 py-1.5 !text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-none h-16 bg-white placeholder:text-gray-300"
                                            placeholder="T&C Details (Optional - This will show in a dynamic modal when customer clicks T&C link)"
                                        />
                                    </div>
                                );
                            })}
                            {(!formData.offers || formData.offers.length === 0) && <p className="!text-xs text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-dashed border-gray-100 text-center">No offers added. Use "Add Offer" to define promotional deals.</p>}
                        </div>
                    </div>

                    {/* Warranty & Services (New) */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <h4 className="!text-xs font-semibold text-gray-900 !uppercase tracking-wider mb-2">Warranty & Services</h4>

                        {/* Exchange */}
                        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.exchange_available}
                                    onChange={(e) => setFormData(prev => ({ ...prev, exchange_available: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="!text-sm font-medium text-gray-900">Enable Exchange Offer</span>
                            </label>
                            {formData.exchange_available && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <span className="!text-sm text-gray-500">Max Discount: ₹</span>
                                    <input
                                        type="number"
                                        value={formData.exchange_discount || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, exchange_discount: e.target.value }))}
                                        className="w-24 px-2 py-1 !text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Warranty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block !text-xs font-semibold text-gray-500 uppercase mb-1">Warranty Summary</label>
                                <input
                                    type="text"
                                    value={formData.warranty || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                                    className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 1 Year Brand Warranty"
                                />
                            </div>
                            <div>
                                <label className="block !text-xs font-semibold text-gray-500 uppercase mb-1">Warranty Details (T&C)</label>
                                <textarea
                                    value={formData.warranty_details || ""}
                                    onChange={(e) => setFormData(prev => ({ ...prev, warranty_details: e.target.value }))}
                                    className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-[42px]"
                                    placeholder="Details..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment Options */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="!text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Options Summary</label>
                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, payment_options: [...(prev.payment_options || []), ""] }))} className="!text-xs text-blue-600 font-bold hover:underline">+ Add Option</button>
                            </div>
                            <div className="space-y-2">
                                {(formData.payment_options || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            value={item}
                                            onChange={(e) => {
                                                const newPaymentOptions = [...(formData.payment_options || [])];
                                                newPaymentOptions[idx] = e.target.value;
                                                setFormData(prev => ({ ...prev, payment_options: newPaymentOptions }));
                                            }}
                                            className="flex-1 px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. No Cost EMI available"
                                        />
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, payment_options: (prev.payment_options || []).filter((_, i) => i !== idx) }))} className="text-red-500 mb-0.5"><X size={16} /></button>
                                    </div>
                                ))}
                                {(!formData.payment_options || formData.payment_options.length === 0) && <p className="!text-xs text-gray-400 italic">No payment options added.</p>}
                            </div>
                        </div>

                        {/* Detailed Payment Info (Dynamic Modal Source) - Reused Logic */}
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 text-blue-700 p-1.5 rounded-lg">
                                        <Info size={16} />
                                    </div>
                                    <div>
                                        <label className="!text-sm font-bold text-gray-900">Detailed Payment Information (Modal)</label>
                                        <p className="!text-[10px] text-gray-500 font-medium">Add categories, banks, and EMI plans for the "View Details" modal.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTechnicalMode(!technicalMode)}
                                    className="!text-[10px] bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-50 transition-colors"
                                >
                                    {technicalMode ? "Standard View" : "Technical View (JSON)"}
                                </button>
                            </div>

                            {technicalMode ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={typeof formData.payment_details === 'object' ? JSON.stringify(formData.payment_details, null, 2) : formData.payment_details || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, payment_details: e.target.value }))}
                                        className="w-full px-4 py-3 !text-xs font-mono border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-60 bg-white"
                                        placeholder='{ "No Cost EMI": { "Bajaj": [...] } }'
                                    />
                                    <p className="text-[10px] text-red-500 italic font-medium px-1">
                                        * Warning: Invalid JSON will break the Standard View.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(pd).map(([category, institutions], catIdx) => (
                                        <div key={catIdx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative group">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newPd = { ...pd };
                                                    delete newPd[category];
                                                    handlePDChange(newPd);
                                                }}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                            <div className="flex gap-2 items-center mb-4">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Category</span>
                                                <input
                                                    className="flex-1 font-bold text-gray-900 border-none p-0 focus:ring-0 !text-sm bg-transparent"
                                                    value={category}
                                                    onChange={(e) => {
                                                        const newCategory = e.target.value;
                                                        if (!newCategory) return;
                                                        const newPd = { ...pd };
                                                        newPd[newCategory] = institutions;
                                                        delete newPd[category];
                                                        handlePDChange(newPd);
                                                    }}
                                                    placeholder="e.g. No Cost EMI"
                                                />
                                            </div>

                                            <div className="space-y-3 pl-4 border-l-2 border-blue-50">
                                                {Object.entries(institutions || {}).map(([instName, plans], instIdx) => (
                                                    <div key={instIdx} className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 relative group/inst">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newInsts = { ...institutions };
                                                                delete newInsts[instName];
                                                                const newPd = { ...pd, [category]: newInsts };
                                                                handlePDChange(newPd);
                                                            }}
                                                            className="absolute top-1 right-1 p-1 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="flex gap-2 items-center mb-2">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Bank/Institution</span>
                                                            <input
                                                                className="flex-1 font-bold text-gray-800 border-none bg-transparent p-0 focus:ring-0 !text-xs"
                                                                value={instName}
                                                                onChange={(e) => {
                                                                    const newInstName = e.target.value;
                                                                    if (!newInstName) return;
                                                                    const newInsts = { ...institutions };
                                                                    newInsts[newInstName] = plans;
                                                                    delete newInsts[instName];
                                                                    const newPd = { ...pd, [category]: newInsts };
                                                                    handlePDChange(newPd);
                                                                }}
                                                                placeholder="e.g. Bajaj Finserv"
                                                            />
                                                        </div>

                                                        <div className="space-y-1 mt-2">
                                                            <div className="grid grid-cols-3 gap-2 px-1 mb-1">
                                                                <label className="text-[8px] font-black text-gray-400 uppercase">Months</label>
                                                                <label className="text-[8px] font-black text-gray-400 uppercase text-center">EMI Amount</label>
                                                                <label className="text-[8px] font-black text-gray-400 uppercase text-right">Overall</label>
                                                            </div>
                                                            {Array.isArray(plans) && plans.map((plan, planIdx) => (
                                                                <div key={planIdx} className="flex gap-1.5 items-center">
                                                                    <input
                                                                        className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                                                        value={plan.months}
                                                                        onChange={(e) => {
                                                                            const newPlans = [...plans];
                                                                            newPlans[planIdx] = { ...plan, months: e.target.value };
                                                                            const newPd = { ...pd, [category]: { ...institutions, [instName]: newPlans } };
                                                                            handlePDChange(newPd);
                                                                        }}
                                                                        placeholder="3"
                                                                    />
                                                                    <input
                                                                        className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-center bg-white"
                                                                        value={plan.monthlyEMI}
                                                                        onChange={(e) => {
                                                                            const newPlans = [...plans];
                                                                            newPlans[planIdx] = { ...plan, monthlyEMI: e.target.value };
                                                                            const newPd = { ...pd, [category]: { ...institutions, [instName]: newPlans } };
                                                                            handlePDChange(newPd);
                                                                        }}
                                                                        placeholder="₹13333"
                                                                    />
                                                                    <input
                                                                        className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-right bg-white"
                                                                        value={plan.overallCost}
                                                                        onChange={(e) => {
                                                                            const newPlans = [...plans];
                                                                            newPlans[planIdx] = { ...plan, overallCost: e.target.value };
                                                                            const newPd = { ...pd, [category]: { ...institutions, [instName]: newPlans } };
                                                                            handlePDChange(newPd);
                                                                        }}
                                                                        placeholder="₹39999"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newPlans = plans.filter((_, i) => i !== planIdx);
                                                                            const newPd = { ...pd, [category]: { ...institutions, [instName]: newPlans } };
                                                                            handlePDChange(newPd);
                                                                        }}
                                                                        className="text-gray-300 hover:text-red-500"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newPlans = [...(plans || []), { months: "", monthlyEMI: "", overallCost: "" }];
                                                                    const newInsts = { ...institutions, [instName]: newPlans };
                                                                    const newPd = { ...pd, [category]: newInsts };
                                                                    handlePDChange(newPd);
                                                                }}
                                                                className="text-[9px] text-blue-600 font-bold flex items-center gap-1 hover:underline mt-1"
                                                            >
                                                                <Plus size={10} /> Add EMI Row
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newInsts = { ...institutions, "New Bank": [] };
                                                        const newPd = { ...pd, [category]: newInsts };
                                                        handlePDChange(newPd);
                                                    }}
                                                    className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline pt-1"
                                                >
                                                    <Plus size={12} /> Add Bank/Institution
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newPd = { ...pd, "New Category": { "New Bank": [] } };
                                            handlePDChange(newPd);
                                        }}
                                        className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 !text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Add Payment Category (Tab)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Specifications (Key-Value) */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="!text-xs font-semibold text-gray-700 uppercase tracking-wider">Specifications</label>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, specifications: { ...(prev.specifications || {}), "": "" } }))} className="!text-xs text-blue-600 font-bold hover:underline">+ Add Spec</button>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(formData.specifications || {}).map(([key, val], idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        value={key}
                                        onChange={(e) => {
                                            const newKey = e.target.value;
                                            const newSpecs = { ...(formData.specifications || {}) };
                                            const content = newSpecs[key];
                                            delete newSpecs[key];
                                            newSpecs[newKey] = content;
                                            setFormData(prev => ({ ...prev, specifications: newSpecs }));
                                        }}
                                        className="w-1/3 px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                        placeholder="Label (e.g. Color)"
                                    />
                                    <input
                                        value={val}
                                        onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                specifications: { ...(prev.specifications || {}), [key]: e.target.value }
                                            }));
                                        }}
                                        className="flex-1 px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Value (e.g. Red)"
                                    />
                                    <button type="button" onClick={() => {
                                        const newSpecs = { ...(formData.specifications || {}) };
                                        delete newSpecs[key];
                                        setFormData(prev => ({ ...prev, specifications: newSpecs }));
                                    }} className="text-red-500 mb-0.5"><X size={16} /></button>
                                </div>
                            ))}
                            {Object.keys(formData.specifications || {}).length === 0 && <p className="!text-xs text-gray-400 italic">No specifications added.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Global & Advanced (Stacked) - Kept as requested by implicit 'admin/seller' requirement but stacked */}
            {/* Global Delivery */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm !font-semibold !text-gray-900 mb-4 flex items-center gap-2"><Globe size={18} className="text-blue-600" /> Global Delivery</h3>
                <div className="space-y-6">
                    <div className="border-b pb-4">
                        <div className="flex items-start gap-3 mb-2">
                            <input type="checkbox" id="worldwide_delivery" className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <div className="flex-1">
                                <label htmlFor="worldwide_delivery" className="block !text-sm font-medium text-gray-900 cursor-pointer">Worldwide delivery</label>
                                <p className="!text-xs text-gray-500 mt-1">Only available with Shipping method: <span className="font-medium">Fulfilled by Phoenix</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="border-b pb-4">
                        <label className="block !text-sm font-medium text-gray-900 mb-3">Selected Countries</label>
                        <input type="text" placeholder="Type country name" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p className="!text-xs text-gray-500 mt-2">Search and select countries for delivery</p>
                    </div>
                    <div>
                        <div className="flex items-start gap-3">
                            <input type="checkbox" id="local_delivery" className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                            <div className="flex-1">
                                <label htmlFor="local_delivery" className="block !text-sm font-medium text-gray-900 cursor-pointer">Local delivery</label>
                                <p className="!text-xs text-gray-500 mt-1">Deliver to your country of residence <button type="button" className="text-blue-600 hover:underline">Change profile address</button></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="!text-sm !font-semibold text-gray-900 mb-4 flex items-center gap-2"><Lock size={18} className="text-blue-600" /> Advanced</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">Product ID Type</label>
                            <select className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="isbn">ISBN</option>
                                <option value="upc">UPC</option>
                                <option value="ean">EAN</option>
                                <option value="asin">ASIN</option>
                            </select>
                        </div>
                        <div>
                            <label className="block !text-sm font-medium text-gray-700 mb-2">Product ID</label>
                            <input type="text" placeholder="ISBN Number" className="w-full px-3 py-2 !text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventorySection;
