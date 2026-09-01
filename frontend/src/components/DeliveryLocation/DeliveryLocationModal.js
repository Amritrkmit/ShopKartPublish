import React, { useState } from 'react';
import { X, Search, MapPin, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DeliveryLocationModal = ({ isOpen, onClose, onUseCurrentLocation, onSearchLocation }) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearchLocation(searchQuery);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[1100] md:hidden"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-0 bottom-0 z-[1101] md:hidden animate-slide-up">
                <div className="bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
                        <h2 className="text-lg font-bold text-gray-900">Select delivery address</h2>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Search Input */}
                        <form onSubmit={handleSearch}>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by area, street name, pin code"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </form>

                        {/* Use Current Location */}
                        <button
                            onClick={onUseCurrentLocation}
                            className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <MapPin size={20} className="text-white" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-blue-600 font-semibold text-sm">Use my current location</p>
                                <p className="text-gray-500 text-xs">Allow access to location</p>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="border-t border-gray-200 my-4"></div>

                        {/* Saved Addresses */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Saved addresses</h3>
                            {user ? (
                                <div className="text-center py-6 text-gray-500 text-sm">
                                    <p>No saved addresses yet</p>
                                    <p className="text-xs mt-1">Add an address after selecting location</p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        onClose();
                                        // Trigger login modal
                                        window.dispatchEvent(new CustomEvent('openAuthModal'));
                                    }}
                                    className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                >
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User size={20} className="text-white" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-blue-600 font-semibold text-sm">Login to see saved addresses</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DeliveryLocationModal;
