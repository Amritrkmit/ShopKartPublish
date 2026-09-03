import React from 'react';
import { Trash2, Plus, Upload, MoveUp, MoveDown, Image as ImageIcon } from 'lucide-react';

const FeatureManager = ({ features, onChange }) => {
    const addFeature = () => {
        onChange([...features, { title: '', description: '', image: '', file: null, preview: null }]);
    };

    const removeFeature = (index) => {
        const newFeatures = features.filter((_, i) => i !== index);
        onChange(newFeatures);
    };

    const handleFeatureChange = (index, field, value) => {
        const newFeatures = [...features];
        newFeatures[index][field] = value;
        onChange(newFeatures);
    };

    const handleImageChange = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            const newFeatures = [...features];
            newFeatures[index].file = file;
            newFeatures[index].preview = preview;
            newFeatures[index].image = '__NEW_IMAGE__';
            onChange(newFeatures);
        }
    };

    const moveFeature = (index, direction) => {
        const newFeatures = [...features];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newFeatures.length) {
            [newFeatures[index], newFeatures[targetIndex]] = [newFeatures[targetIndex], newFeatures[index]];
            onChange(newFeatures);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Product Description Features</h3>
                <button
                    type="button"
                    onClick={addFeature}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Add Feature Block
                </button>
            </div>

            {features.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <ImageIcon className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-gray-500 text-sm">No feature blocks added yet. Click "Add Feature Block" to begin.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative group">
                            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => moveFeature(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                >
                                    <MoveUp size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveFeature(index, 'down')}
                                    disabled={index === features.length - 1}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                                >
                                    <MoveDown size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeFeature(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-600"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {/* Image Upload Area */}
                                <div className="md:col-span-1">
                                    <div className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden group/img">
                                        {feature.preview || feature.image ? (
                                            <>
                                                <img
                                                    src={feature.preview || (feature.image.startsWith('http') || feature.image.startsWith('/assets') ? (feature.image.startsWith('/assets') ? `${process.env.REACT_APP_API_BASE_URL || ""}${feature.image}` : feature.image) : feature.image)}
                                                    alt={`Feature ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                    <label className="cursor-pointer p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors text-white">
                                                        <Upload size={20} />
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => handleImageChange(index, e)}
                                                        />
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center gap-2">
                                                <Upload size={24} className="text-gray-400" />
                                                <span className="text-xs text-gray-500 font-medium">Upload Image</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageChange(index, e)}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Text Content Area */}
                                <div className="md:col-span-3 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Feature Title
                                        </label>
                                        <input
                                            type="text"
                                            value={feature.title}
                                            onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                                            placeholder="e.g. Premium Built Quality"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                            Feature Description
                                        </label>
                                        <textarea
                                            value={feature.description}
                                            onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                                            placeholder="Describe this feature in detail..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-800 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeatureManager;
