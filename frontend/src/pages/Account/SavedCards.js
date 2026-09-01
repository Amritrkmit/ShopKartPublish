
import React, { useState, useEffect } from 'react';
import AccountLayout from './AccountLayout';
import { Trash2, Plus, CreditCard } from "lucide-react";
import ConfirmationModal from "../../components/ConfirmationModal";

const STORAGE_KEY = 'savedCards';
const defaultCards = [
    {
        id: 1,
        cardNumber: '**** **** **** 1234',
        cardType: 'VISA',
        cardHolder: 'AMRIT VIDYARTHI',
        expiryMonth: '12',
        expiryYear: '2026'
    },
    {
        id: 2,
        cardNumber: '**** **** **** 5678',
        cardType: 'MASTERCARD',
        cardHolder: 'AMRIT VIDYARTHI',
        expiryMonth: '08',
        expiryYear: '2027'
    }
];

const SavedCards = () => {
    const [cards, setCards] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : defaultCards;
    });

    // Persist to localStorage whenever cards change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }, [cards]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
    const [newCard, setNewCard] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        cardHolder: ''
    });

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        // Placeholder for actual API call
        // In a real application, you would import axios and API_BASE_URL, token, toastSuccess, toastError
        // For this example, we'll simulate the deletion directly.
        try {
            // await axios.delete(`${ API_BASE_URL } /users/cards / ${ id } `, {
            //     headers: { Authorization: `Bearer ${ token } ` }
            // });
            setCards(prev => prev.filter(c => c.id !== id));
            console.log("Card removed successfully (simulated)"); // toastSuccess("Card removed successfully");
        } catch (err) {
            console.error("Failed to remove card (simulated)", err); // toastError("Failed to remove card");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    const detectCardType = (number) => {
        const cleaned = number.replace(/\s/g, '');
        if (cleaned.startsWith('4')) return 'VISA';
        if (cleaned.startsWith('5')) return 'MASTERCARD';
        if (cleaned.startsWith('6')) return 'RUPAY';
        if (cleaned.startsWith('3')) return 'AMEX';
        return 'VISA';
    };

    const handleAddCard = () => {
        if (!newCard.cardNumber || !newCard.expiry || !newCard.cardHolder) {
            alert('Please fill all required fields');
            return;
        }

        const [month, year] = newCard.expiry.split('/');
        const maskedNumber = '**** **** **** ' + newCard.cardNumber.replace(/\s/g, '').slice(-4);

        const cardToAdd = {
            id: Date.now(),
            cardNumber: maskedNumber,
            cardType: detectCardType(newCard.cardNumber),
            cardHolder: newCard.cardHolder.toUpperCase(),
            expiryMonth: month,
            expiryYear: '20' + year
        };

        setCards([...cards, cardToAdd]);
        setNewCard({ cardNumber: '', expiry: '', cvv: '', cardHolder: '' });
        setShowAddForm(false);
    };


    const getCardIcon = (type) => {
        const colors = {
            VISA: 'from-blue-500 to-blue-600',
            MASTERCARD: 'from-orange-500 to-red-500',
            RUPAY: 'from-green-500 to-teal-500',
            AMEX: 'from-gray-600 to-gray-700'
        };
        return colors[type] || 'from-purple-500 to-indigo-500';
    };

    return (
        <AccountLayout>
            <div className="bg-white shadow-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-medium text-gray-800">Saved Cards</h2>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 text-[#dc3545] border border-[#dc3545] rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                    >
                        <Plus size={18} />
                        Add New Card
                    </button>
                </div>

                {/* Add Card Form */}
                {showAddForm && (
                    <div className="p-6 border-b bg-gray-50">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Add Debit/Credit Card</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                    <input
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        maxLength="19"
                                        value={newCard.cardNumber}
                                        onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            maxLength="5"
                                            value={newCard.expiry}
                                            onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                                        <input
                                            type="password"
                                            placeholder="123"
                                            maxLength="4"
                                            value={newCard.cvv}
                                            onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
                                    <input
                                        type="text"
                                        placeholder="CARDHOLDER NAME"
                                        value={newCard.cardHolder}
                                        onChange={(e) => setNewCard({ ...newCard, cardHolder: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleAddCard}
                                        className="flex-1 px-6 py-2 bg-[#dc3545] text-white font-medium rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Save Card
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setNewCard({ cardNumber: '', expiry: '', cvv: '', cardHolder: '' });
                                        }}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cards List */}
                {cards.length === 0 ? (
                    <div className="text-center py-20 px-6">
                        <CreditCard className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-lg mb-4">No cards saved yet</p>
                        <p className="text-sm text-gray-400">Add your debit/credit card for faster checkouts</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {cards.map((card) => (
                            <div key={card.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-center justify-between">
                                    {/* Card Visual */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w - 16 h - 10 bg - gradient - to - br ${getCardIcon(card.cardType)} rounded - lg flex items - center justify - center shadow - md`}>
                                            <CreditCard className="w-8 h-8 text-white" />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium text-gray-900">{card.cardNumber}</p>
                                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                                                    {card.cardType}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{card.cardHolder}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Expires: {card.expiryMonth}/{card.expiryYear}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Remove card"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Security Info */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Your cards are secure</p>
                            <p className="text-xs text-gray-500 mt-1">
                                All card information is encrypted and stored securely. We never share your card details with anyone.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Remove Card?"
                message="Are you sure you want to remove this saved card? This action cannot be undone."
                confirmText="Remove Card"
            />

        </AccountLayout>
    );
};

export default SavedCards;
