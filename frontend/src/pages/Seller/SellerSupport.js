import React, { useState } from "react";
import axios from "axios";
import { MessageSquare, Send, Mail, FileText, ChevronRight, Info, HelpCircle } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerSupport = () => {

    const [ticket, setTicket] = useState({ subject: "", description: "", priority: "MEDIUM" });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.post(`${API_BASE_URL}/seller/support`, ticket, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toastSuccess("Support ticket created!");
            setTicket({ subject: "", description: "", priority: "MEDIUM" });
        } catch (err) {
            toastError("Failed to submit ticket");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 -m-8 pb-20">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Help Center</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Seller Support</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Send size={18} />
                                {submitting ? "Sending..." : "Submit Ticket"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Knowledge Base */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                                <HelpCircle className="text-blue-500" size={20} />
                                <h3 className="text-sm font-semibold text-gray-900">Merchant FAQs</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    "Payout schedules",
                                    "Returns & Refunds policy",
                                    "Account verification",
                                    "Commission structures"
                                ].map((q, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group">
                                        <span className="text-xs font-bold text-gray-700">{q}</span>
                                        <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-600" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white rounded-lg p-6 shadow-lg shadow-gray-200">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-6">Quick Contacts</h4>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Email Support</p>
                                        <p className="text-xs font-medium">help@add.com</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-green-400">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Instant Chat</p>
                                        <p className="text-xs font-medium">Available 24x7</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* New Ticket Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                            <h3 className="text-base font-semibold text-gray-900 mb-2">Need specific help?</h3>
                            <p className="text-xs text-gray-400 font-medium mb-8">Raising a ticket helps us track and resolve your issues faster.</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 italic tracking-widest uppercase text-[10px]">Issue Subject</label>
                                    <input
                                        type="text" required value={ticket.subject}
                                        onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                                        placeholder="e.g. My latest payout is still pending..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 italic tracking-widest uppercase text-[10px]">Priority Level</label>
                                        <select
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-gray-50"
                                            value={ticket.priority}
                                            onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent / Critical</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 italic tracking-widest uppercase text-[10px]">Support Mode</label>
                                        <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg font-bold text-gray-400">
                                            <FileText size={16} /> Online Ticket
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 italic tracking-widest uppercase text-[10px]">Detailed Description</label>
                                    <textarea
                                        required rows="6" value={ticket.description}
                                        onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Please provide any order IDs or reference numbers..."
                                    />
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-100 mt-8">
                                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                                        Response time is typically under 4 hours for URGENT tickets and within 24 hours for others.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerSupport;
