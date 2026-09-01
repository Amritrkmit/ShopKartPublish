import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Store, Mail, Lock, ArrowRight } from "lucide-react";


const SellerLogin = () => {
    const navigate = useNavigate();
    const { loginSeller } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/api";
        try {
            const res = await axios.post(`${API_BASE_URL}/sellers/login`, { email, password });

            const sellerData = res.data.seller || res.data.user; // Compatibility fallback
            loginSeller(sellerData, res.data.token);
            toastSuccess(`Welcome back to the Merchant Panel, ${(sellerData?.name || "Merchant").split(" ")[0]}!`);

            // Small delay to ensure state is committed before hitting RoleRoute
            setTimeout(() => {
                navigate("/seller/dashboard/");
            }, 50);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toastError(err.response.data.message);
            } else {
                toastError(axiosErrorMessage(err, "Merchant login failed"));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                        <Store className="text-white w-8 h-8 rotate-6" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Seller Central
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Manage your business, orders, and products
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
                    <form className="space-y-6" onSubmit={handleLoginSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link to="/forgot-password?role=seller" className="font-medium text-emerald-600 hover:text-emerald-500">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all uppercase tracking-wider"
                            >
                                {loading ? "Signing in..." : "Continue to Dashboard"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    New to our marketplace?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Link
                                to="/seller/register/"
                                className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                            >
                                Register as a Merchant
                                <ArrowRight className="ml-2 w-4 h-4 text-emerald-600" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400">
                Official Merchant Portal • &copy; {new Date().getFullYear()} ShopKart Inc.
            </div>
        </div>
    );
};

export default SellerLogin;
