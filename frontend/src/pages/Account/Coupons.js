import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AccountLayout from './AccountLayout';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { Ticket, Copy, Check } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const Coupons = () => {
    const [copiedCode, setCopiedCode] = useState(null);

    const [coupons, setCoupons] = useState([]);
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

    const fetchCoupons = useCallback(async () => {
        try {
            const token = localStorage.getItem("userToken");
            if (!token) return;

            const res = await axios.get(`${API_BASE_URL}/api/coupons/my-coupons`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Transform data to match UI
            const formatted = res.data.map(c => ({
                id: c.id,
                code: c.code,
                title: c.discount_type === 'flat' ? `Flat ${formatPrice(c.discount_value)} OFF` : `${c.discount_value}% OFF`,
                description: c.description,
                validTill: c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'Lifetime',
                minOrder: c.min_order_value,
                discount: c.discount_value,
                active: c.is_active && (!c.valid_until || new Date(c.valid_until) > new Date())
            }));
            setCoupons(formatted);
        } catch (err) {
            console.error("Failed to fetch coupons", err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        { label: 'My Account', href: '/account/profile/' },
        { label: 'My Coupons' }
    ];

    return (
        <>
            <Breadcrumb items={breadcrumbItems} />
            <AccountLayout>
                <div className="bg-white shadow-sm">
                    {/* Header */}
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-xl font-medium text-gray-800">My Coupons</h2>
                    </div>

                    {/* Coupons List */}
                    {coupons.length === 0 ? (
                        <div className="text-center py-20 px-6">
                            <Ticket className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-500 text-lg mb-4">No coupons available.</p>
                            <p className="text-sm text-gray-400">Check back later for exciting offers!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {coupons.map((coupon) => (
                                <div
                                    key={coupon.id}
                                    className={`p-6 ${!coupon.active ? 'opacity-50 bg-gray-50' : ''}`}
                                >
                                    <div className="flex items-start justify-between">
                                        {/* Coupon Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Ticket className="w-5 h-5 text-[#dc3545]" />
                                                <h3 className="text-lg font-semibold text-gray-900">{coupon.title}</h3>
                                                {!coupon.active && (
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                                        Used
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>

                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>Valid till: {coupon.validTill}</span>
                                                <span>•</span>
                                                <span>Min. order: {formatPrice(coupon.minOrder)}</span>
                                            </div>
                                        </div>

                                        {/* Coupon Code */}
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[#dc3545] bg-blue-50 rounded">
                                                <code className="text-[#dc3545] font-bold text-sm">{coupon.code}</code>
                                            </div>

                                            {coupon.active && (
                                                <button
                                                    onClick={() => handleCopy(coupon.code)}
                                                    className="flex items-center gap-1 text-xs text-[#dc3545] hover:underline"
                                                >
                                                    {copiedCode === coupon.code ? (
                                                        <>
                                                            <Check size={14} />
                                                            <span>Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={14} />
                                                            <span>Copy Code</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AccountLayout>
        </>
    );
};

export default Coupons;
