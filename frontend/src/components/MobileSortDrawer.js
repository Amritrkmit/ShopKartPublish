import React from 'react';
import { X, Check } from 'lucide-react';

const sortOptions = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'Price -- Low to High', value: 'price -- low to high' },
    { label: 'Price -- High to Low', value: 'price -- high to low' },
    { label: 'Newest First', value: 'newest first' },
];

const MobileSortDrawer = ({ isOpen, onClose, activeSort, onSortChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl transform transition-transform duration-300 ease-out animate-slide-up">
                <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Sort By</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-2">
                    {sortOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onSortChange(option.value);
                                onClose();
                            }}
                            className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors rounded-lg group"
                        >
                            <span className={`text-[15px] ${activeSort === option.value ? 'text-brand-orange font-bold' : 'text-gray-700 font-medium'}`}>
                                {option.label}
                            </span>
                            {activeSort === option.value && (
                                <div className="w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <div className="h-6" /> {/* Bottom safe area padding */}
            </div>
        </div>
    );
};

export default MobileSortDrawer;
