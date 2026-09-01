import React from 'react';
import { X } from 'lucide-react';

const RemoveItemModal = ({ isOpen, onClose, onConfirm, itemName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
            <div
                className="bg-white rounded-[2px] shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 relative">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Title */}
                    <h3 className="text-[19px] font-bold text-[#212121] mb-6 pr-8">
                        Remove Item
                    </h3>

                    {/* Message */}
                    <p className="text-[#878787] text-[15px] mb-8 leading-relaxed">
                        Are you sure you want to remove this item?{itemName && <span className="block mt-1 font-medium text-gray-700">{itemName}</span>}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 bg-[#2874f0] text-white font-bold text-[14px] uppercase rounded-[2px] shadow-md hover:bg-[#1261e4] transition-colors"
                        >
                            REMOVE
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white text-[#212121] border border-[#dbdbdb] font-bold text-[14px] uppercase rounded-[2px] hover:bg-gray-50 transition-colors"
                        >
                            CANCEL
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemoveItemModal;
