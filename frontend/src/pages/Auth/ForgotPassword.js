import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Store, ShieldCheck, Mail, ArrowRight } from "lucide-react";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = searchParams.get("role") || "user";
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toastError("Please enter your registered email");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/forgot-password`, { email, role });
            toastSuccess("OTP sent successfully to your email");
            navigate(`/verify-otp?email=${encodeURIComponent(email)}&role=${role}`);
        } catch (err) {
            toastError(axiosErrorMessage(err, "Failed to send OTP"));
        } finally {
            setIsLoading(false);
        }
    };

    // ----------------------------------------------------------------------
    // ADMIN LAYOUT
    // ----------------------------------------------------------------------
    if (role === 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>

                <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
                            <ShieldCheck className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
                        <p className="text-gray-400">Enter your admin email to reset password</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                        >
                            {isLoading ? "Sending OTP..." : "Request Reset Link"}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-white/10 pt-6">
                        <Link to="/admin/login" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------------
    // SELLER LAYOUT
    // ----------------------------------------------------------------------
    if (role === 'seller') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                            <Store className="text-white w-8 h-8 rotate-6" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Trouble logging in?
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your merchant email and we'll send you an OTP
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
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
                                        placeholder="merchant@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Sending..." : "Send OTP Code"}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">
                                        Or return to login
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Link
                                    to="/seller/login"
                                    className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
                                >
                                    Back to Login
                                    <ArrowRight className="ml-2 w-4 h-4 text-emerald-600" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------------
    // USER LAYOUT (Default)
    // ----------------------------------------------------------------------
    return (
        <div className="bg-[#f1f3f6] min-h-screen py-8 flex items-center justify-center">
            <div className="bg-white rounded-[4px] shadow-lg flex flex-col md:flex-row w-full max-w-[800px] h-auto md:h-[500px] overflow-hidden mx-4">

                {/* --- Left Panel --- */}
                <div className="bg-brand-orange text-white p-8 md:w-[40%] flex flex-col justify-between relative bg-no-repeat bg-bottom pb-12"
                    style={{ backgroundImage: 'url(https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png)', backgroundSize: 'contain' }}>
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
                        <p className="text-[#dbdbdb] text-base leading-6 font-medium">
                            Enter your email to verify your account and reset your password.
                        </p>
                    </div>
                </div>

                {/* --- Right Panel --- */}
                <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-center relative">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="relative">
                            <input
                                type="email"
                                className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                placeholder="Enter Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                            <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                Enter Registered Email
                            </label>
                        </div>

                        <button
                            disabled={isLoading}
                            className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? "Sending..." : "Request OTP"}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-gray-100">
                        <Link to="/login" className="text-sm font-medium text-brand-orange hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
