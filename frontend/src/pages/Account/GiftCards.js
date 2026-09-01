import React from 'react';
import AccountLayout from './AccountLayout';
import { Gift, Plus } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const GiftCards = () => {
    const balance = 0; // Gift card balance

    return (
        <AccountLayout>
            <div className="bg-white shadow-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-medium text-gray-800">Gift Cards</h2>
                </div>

                {/* Balance Display */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                            <p className="text-3xl font-bold text-gray-900">{formatPrice(balance)}</p>
                        </div>
                        <Gift className="w-16 h-16 text-[#dc3545] opacity-20" />
                    </div>
                </div>

                {/* Add Gift Card Section */}
                <div className="p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Add Gift Card</h3>

                    <div className="flex gap-3 mb-6">
                        <input
                            type="text"
                            placeholder="Enter gift card code"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545] focus:border-transparent"
                        />
                        <button className="px-6 py-2 bg-[#dc3545] text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Plus size={18} />
                            Add
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 text-sm mb-2">How to use Gift Cards?</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Enter your gift card code above and click "Add"</li>
                            <li>• The amount will be added to your gift card balance</li>
                            <li>• Use this balance while making purchases</li>
                            <li>• Gift card balance can be used for multiple orders</li>
                        </ul>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="border-t">
                    <div className="px-6 py-4 bg-gray-50">
                        <h3 className="text-base font-semibold text-gray-900">Transaction History</h3>
                    </div>

                    <div className="text-center py-12 px-6">
                        <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No transactions yet</p>
                        <p className="text-sm text-gray-400 mt-1">Your gift card transactions will appear here</p>
                    </div>
                </div>
            </div>
        </AccountLayout>
    );
};

export default GiftCards;
