import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronRight, TrendingUp, Clock, CheckCircle2, XCircle, CreditCard, Wallet, ArrowUpRight } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerEarnings = () => {
    const [finance, setFinance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState("");

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/seller/earnings`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            setFinance(res.data);
        } catch (err) {
            console.error("Error fetching earnings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePayoutRequest = async (e) => {
        if (e) e.preventDefault();
        const amount = parseFloat(payoutAmount);

        if (!amount || amount <= 0) {
            toastError("Please enter a valid amount");
            return;
        }

        if (amount > (finance?.wallet?.current_balance || 0)) {
            toastError("Insufficient balance");
            return;
        }

        setRequesting(true);
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.post(`${API_BASE_URL}/seller/payouts/request`, { amount }, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            toastSuccess("Payout request submitted successfully!");
            setPayoutAmount("");
            fetchEarnings();
        } catch (err) {
            toastError(err.response?.data?.message || "Failed to submit request");
        } finally {
            setRequesting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading finances...</div>;

    // Fix: Safely destructure with defaults
    const {
        wallet = { current_balance: 0, total_earned: 0 },
        payouts = [],
        transactions = []
    } = finance || {};

    return (
        <div className="min-h-screen bg-gray-50 -m-8">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Finances</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Earnings & Payouts</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePayoutRequest}
                                disabled={requesting || (wallet?.current_balance || 0) <= 0}
                                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <ArrowUpRight size={16} />
                                {requesting ? "Processing..." : "Withdraw Funds"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left - Balance & History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <Wallet size={20} />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available for Withdrawal</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-2">₹{wallet?.current_balance?.toLocaleString('en-IN') || "0.00"}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Updated just now</p>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales (Life-time)</span>
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-2">₹{wallet?.total_earned?.toLocaleString('en-IN') || "0.00"}</h3>
                                <div className="flex items-center gap-2 text-green-600 text-[10px] font-bold uppercase tracking-widest">
                                    Includes Commission & Fees
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions with Fees */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h4 className="text-sm font-semibold text-gray-900">Earnings Breakdown (Per Order)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 text-[10px] font-semibold uppercase tracking-widest border-b border-gray-100">
                                            <th className="px-6 py-4 text-left">Order Detail</th>
                                            <th className="px-6 py-4 text-right">Gross Amount</th>
                                            <th className="px-6 py-4 text-right">Fees Charged</th>
                                            <th className="px-6 py-4 text-right">Net Earning</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((t) => (
                                            <tr key={t.orderId} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">Order #{t.orderId}</span>
                                                        <span className="text-[10px] text-gray-400 font-medium">{new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-600">₹{t.grossAmount.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-red-500 font-bold">-₹{t.fees.total.toLocaleString('en-IN')}</span>
                                                        <div className="flex flex-wrap gap-2 justify-end">
                                                            <span title="Commission/Referral" className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Comm: ₹{t.fees.commission.toFixed(1)}</span>
                                                            <span title="Closing Fee" className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Close: ₹{t.fees.closingFee}</span>
                                                            <span title="Shipping/Fulfillment" className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Ship: ₹{t.fees.shippingFee}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-green-600">₹{t.netEarnings.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        t.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {transactions.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                                    No recent transactions found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Payouts Table */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h4 className="text-sm font-semibold text-gray-900">Payout History</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 text-[10px] font-semibold uppercase tracking-widest border-b border-gray-100">
                                            <th className="px-6 py-4 text-left">Date</th>
                                            <th className="px-6 py-4 text-left">Reference ID</th>
                                            <th className="px-6 py-4 text-left">Amount</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {payouts.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-600">{new Date(p.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">#{p.id}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">₹{p.amount?.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {p.status === 'PAID' ? <CheckCircle2 size={12} /> :
                                                            p.status === 'PENDING' ? <Clock size={12} /> : <XCircle size={12} />}
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {payouts.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                                                    No payout history found. Withdrawal requests will appear here.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right - Withdrawal Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Request Withdrawal</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={payoutAmount}
                                            onChange={(e) => setPayoutAmount(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium">Max available: ₹{wallet?.current_balance?.toLocaleString()}</p>
                                </div>

                                <button
                                    onClick={handlePayoutRequest}
                                    disabled={requesting || (wallet?.current_balance || 0) <= 0}
                                    className="w-full bg-gray-900 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md disabled:opacity-50"
                                >
                                    {requesting ? "Submitting..." : "Submit Request"}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                                <CreditCard size={14} />
                                Bank Info
                            </div>
                            <p className="text-xs text-blue-700/80 leading-relaxed font-medium">
                                Withdrawals are processed within 3-5 business days to your verified account.
                                <span className="block mt-2 font-bold underline">Contact admin for bank updates.</span>
                            </p>
                        </div>

                        <div className="bg-gray-900 p-5 rounded-lg shadow-xl text-white">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-blue-400">Fee Structure</h3>
                            <div className="space-y-4">
                                <div className="border-l-2 border-blue-500 pl-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Commission</p>
                                    <p className="text-sm font-medium">5% - 20% <span className="text-[10px] text-green-400">(₹0 for items &lt; ₹1,000)</span></p>
                                </div>
                                <div className="border-l-2 border-gray-700 pl-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Closing Fee</p>
                                    <p className="text-sm font-medium">₹5 - ₹60 <span className="text-[10px] text-gray-500">per unit</span></p>
                                </div>
                                <div className="border-l-2 border-gray-700 pl-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Shipping</p>
                                    <p className="text-sm font-medium">Starting at ₹45 <span className="text-[10px] text-gray-500">based on distance</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerEarnings;
