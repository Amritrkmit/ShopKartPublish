import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useCart from '../../hooks/useCart';
import { toastSuccess, toastError } from '../../utils/toast';
import { generateProductUrl } from '../../utils/productUrl';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const SharedCartPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [sharedData, setSharedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        const fetchSharedCart = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/cart/shared/${token}`);
                setSharedData(res.data);
            } catch (err) {
                toastError("This shared cart has expired or doesn't exist.");
                navigate('/');
            } finally {
                setLoading(false);
            }
        };
        fetchSharedCart();
    }, [token, navigate]);

    const handleImport = async () => {
        setImporting(true);
        try {
            // Sequential add to cart for all items
            for (const item of sharedData.items) {
                await addToCart(item.product_id, item.quantity, item.size,
                    JSON.parse(typeof item.selected_options === 'string' ? item.selected_options : JSON.stringify(item.selected_options || {}))
                );
            }
            toastSuccess("All items from shared cart added to your cart!");
            navigate('/cart/');
        } catch (err) {
            toastError("Some items could not be imported. Please try again.");
        } finally {
            setImporting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-t-brand-orange border-gray-200 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="bg-[#f1f3f6] min-h-screen py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-brand-orange to-orange-600 p-8 text-white">
                        <h1 className="text-2xl font-bold mb-2">A shopping cart shared with you!</h1>
                        <p className="opacity-90">Shared by <span className="font-bold underline">{sharedData.owner || "a friend"}</span> on {new Date(sharedData.created_at).toLocaleDateString()}</p>
                    </div>

                    {/* Items */}
                    <div className="p-6 divide-y divide-gray-100">
                        {sharedData.items.map((item, idx) => (
                            <div key={idx} className="py-4 flex gap-6 items-center">
                                <img src={`${API_BASE_URL}${item.image}`} alt={item.name} className="w-20 h-20 object-contain bg-gray-50 rounded p-1" />
                                <div className="flex-1">
                                    <Link to={generateProductUrl(item)} className="font-bold text-gray-800 hover:text-brand-orange transition line-clamp-1">{item.name}</Link>
                                    <p className="text-gray-500 text-sm mt-1">Quantity: {item.quantity}</p>
                                    {item.size && <p className="text-gray-500 text-xs">Size: {item.size}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{formatINR((item.sale_price || item.price) * item.quantity)}</p>
                                    <p className="text-[10px] text-gray-400 capitalize">{item.quantity} x {formatINR(item.sale_price || item.price)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 p-8 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-gray-100">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Estimated Total</p>
                            <p className="text-3xl font-black text-gray-900">
                                {formatINR(sharedData.items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0))}
                            </p>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="bg-brand-orange text-white font-black py-4 px-12 rounded-full shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-sm"
                        >
                            {importing ? "Adding to Cart..." : "Import Cart to My Account"}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link to="/" className="text-gray-500 font-medium hover:text-brand-orange transition">← Continue Shopping</Link>
                </div>
            </div>
        </div>
    );
};

export default SharedCartPage;
