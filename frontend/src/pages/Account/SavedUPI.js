import React, { useState, useEffect } from 'react';
import AccountLayout from './AccountLayout';
import { Smartphone, Plus, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'savedUPI';
const defaultUPI = [
    { id: 1, upiId: 'user@paytm', verified: true },
    { id: 2, upiId: 'user@googlePay', verified: true }
];

const SavedUPI = () => {
    const [upiAddresses, setUpiAddresses] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : defaultUPI;
    });

    // Persist to localStorage whenever UPI addresses change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(upiAddresses));
    }, [upiAddresses]);

    const [newUpi, setNewUpi] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);


    const handleRemove = (id) => {
        setUpiAddresses(upiAddresses.filter(upi => upi.id !== id));
    };

    const handleAdd = () => {
        if (newUpi.trim()) {
            setUpiAddresses([...upiAddresses, {
                id: Date.now(),
                upiId: newUpi.trim(),
                verified: false
            }]);
            setNewUpi('');
            setShowAddForm(false);
        }
    };

    return (
        <AccountLayout>
            <div className="bg-white shadow-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-medium text-gray-800">Saved UPI</h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 text-[#dc3545] border border-[#dc3545] rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                    >
                        <Plus size={18} />
                        Add New UPI
                    </button>
                </div>

                {/* Add UPI Form */}
                {showAddForm && (
                    <div className="p-6 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-900 mb-3">Add UPI ID</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newUpi}
                                onChange={(e) => setNewUpi(e.target.value)}
                                placeholder="Enter UPI ID (e.g., user@paytm)"
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                            />
                            <button
                                onClick={handleAdd}
                                className="px-6 py-2 bg-[#dc3545] text-white font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewUpi('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* UPI List */}
                {upiAddresses.length === 0 ? (
                    <div className="text-center py-20 px-6">
                        <Smartphone className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-lg mb-4">No UPI IDs saved yet</p>
                        <p className="text-sm text-gray-400">Add your UPI ID for faster checkouts</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {upiAddresses.map((upi) => (
                            <div key={upi.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                                            <Smartphone className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{upi.upiId}</p>
                                            {upi.verified ? (
                                                <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="text-xs text-orange-600 mt-1">Pending verification</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRemove(upi.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Remove UPI"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Section */}
                <div className="p-6 border-t bg-gray-50">
                    <p className="text-xs text-gray-500">
                        <strong>Note:</strong> Your UPI ID will be verified during your first transaction. Make sure you enter a valid UPI ID.
                    </p>
                </div>
            </div>
        </AccountLayout>
    );
};

export default SavedUPI;
