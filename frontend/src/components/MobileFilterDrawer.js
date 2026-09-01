import React from 'react';
import { X } from 'lucide-react';

const MobileFilterDrawer = ({
    isOpen,
    onClose,
    onApply,
    onClearAll,
    tabs = [],
    activeTab,
    setActiveTab,
    renderContent
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] bg-white flex flex-col md:hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1">
                        <X size={24} className="text-gray-800" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Filters</h2>
                </div>
                <button
                    onClick={onClearAll}
                    className="text-xs font-bold text-brand-orange uppercase"
                >
                    Clear All
                </button>
            </div>

            {/* Body: Two columns */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tabs (Left) */}
                <div className="w-1/3 bg-gray-50 border-r overflow-y-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-3 font-medium transition-colors border-b border-gray-100 ${activeTab === tab.id
                                ? 'bg-white text-brand-orange border-r-4 border-brand-orange shadow-sm text-[14px]'
                                : 'text-gray-600 text-[13px]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content (Right) */}
                <div className="flex-1 bg-white overflow-y-auto p-3 no-scrollbar">
                    {renderContent()}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-2 border-t flex gap-4 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button
                    onClick={onClose}
                    className="flex-1 py-2 border border-gray-300 rounded text-gray-700 font-bold text-sm uppercase"
                >
                    Close
                </button>
                <button
                    onClick={() => { onApply(); onClose(); }}
                    className="flex-1 py-2 bg-brand-orange text-white rounded font-bold text-sm shadow-md shadow-orange-200 uppercase"
                >
                    Apply
                </button>
            </div>
        </div>
    );
};

export default MobileFilterDrawer;
