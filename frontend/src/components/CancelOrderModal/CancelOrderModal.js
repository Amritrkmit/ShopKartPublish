import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const CancelOrderModal = ({ isOpen, onClose, onConfirm, orderId, isCancelling }) => {
    const [selectedReason, setSelectedReason] = useState("");
    const [customReason, setCustomReason] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalReason = selectedReason === "Other" ? customReason : selectedReason;

        if (!finalReason || !finalReason.trim()) {
            setError("Please provide a reason for cancellation");
            return;
        }
        onConfirm(finalReason);
    };

    const reasons = [
        "Changed my mind",
        "Found a better price elsewhere",
        "Delivery time is too long",
        "Incorrect shipping address",
        "Ordered by mistake",
        "Other"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle size={20} />
                        <h3 className="text-lg font-bold">Cancel Order</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-sm text-gray-600 mb-6 font-medium">
                        Are you sure you want to cancel order <span className="font-bold text-gray-900">{orderId}</span>?
                        This action cannot be undone.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                Why are you cancelling?
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {reasons.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => {
                                            setSelectedReason(r);
                                            setError("");
                                        }}
                                        className={`px-4 py-3 text-left text-sm rounded-xl border transition-all duration-200
                                            ${selectedReason === r
                                                ? "bg-red-50 border-red-500 text-red-700 font-bold ring-4 ring-red-50"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 font-medium"}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedReason === "Other" && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    Additional Details
                                </label>
                                <textarea
                                    value={customReason}
                                    onChange={(e) => {
                                        setCustomReason(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="Please provide more details..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none min-h-[100px] resize-none bg-gray-50"
                                    required
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100 font-medium">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                        >
                            No, keep it
                        </button>
                        <button
                            type="submit"
                            disabled={isCancelling}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCancelling ? "Processing..." : "Cancel Order"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancelOrderModal;
