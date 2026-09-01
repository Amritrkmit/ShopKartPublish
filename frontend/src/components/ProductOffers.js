import React, { useState } from 'react';

const ProductOffers = ({ offers }) => {
    // Local state to toggle view, initialized to false (collapsed)
    const [showAllOffers, setShowAllOffers] = useState(false);

    // Initial safety check
    if (!offers) return null;

    // Parsing logic: handles both JSON string and Array
    let parsedOffers = [];
    try {
        parsedOffers = typeof offers === 'string'
            ? JSON.parse(offers)
            : offers;
    } catch (e) {
        console.error("Failed to parse offers", e);
        return null; // Gracefully fail if JSON is invalid
    }

    // Secondary safety check after parsing
    if (!Array.isArray(parsedOffers) || parsedOffers.length === 0) return null;

    // View logic: slice if not showing all
    const visibleOffers = showAllOffers ? parsedOffers : parsedOffers.slice(0, 4);

    return (
        <div className="mb-6" data-testid="product-offers-container">
            <h3 className="font-bold text-sm text-gray-800 mb-2">Available offers</h3>
            <ul className="space-y-2 text-sm text-gray-700 px-3">
                {visibleOffers.map((offer, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 flex-shrink-0 mt-0.5">
                            {/* Simple checkmark icon */}
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <span>{offer}</span>
                    </li>
                ))}

                {/* Toggle Button - Only shown if more than 4 offers */}
                {parsedOffers.length > 4 && (
                    <button
                        onClick={() => setShowAllOffers(!showAllOffers)}
                        className="text-blue-600 font-bold text-xs hover:underline mt-1 pl-6"
                    >
                        {showAllOffers ? "View Less" : `View ${parsedOffers.length - 4} more offers`}
                    </button>
                )}
            </ul>
        </div>
    );
};

export default ProductOffers;
