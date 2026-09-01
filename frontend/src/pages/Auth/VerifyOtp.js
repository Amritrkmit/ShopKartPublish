import React, { useState, useEffect } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Lock, RefreshCw } from "lucide-react";

const VerifyOtp = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get("email");
    const role = searchParams.get("role") || "user";

    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (!email) {
            toastError("Invalid access. Please start from Forgot Password.");
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    // Resend Timer Logic
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toastError("Please enter a valid 6-digit OTP");
            return;
        }

        setIsLoading(true);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/verify-otp`, { email, otp, role });
            toastSuccess("OTP Verified Successfully");

            // Get the token from response
            const token = res.data.token;

            // Pass token to reset password page via URL (magic link style) or State.
            // URL is safer for reloading pages.
            navigate(`/reset-password?token=${encodeURIComponent(token)}&role=${role}`);

        } catch (err) {
            toastError(axiosErrorMessage(err, "Invalid OTP"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        setIsResending(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/forgot-password`, { email, role });
            toastSuccess(`New OTP sent to ${email}`);
            setResendCooldown(60); // 60 seconds cooldown
        } catch (err) {
            toastError(axiosErrorMessage(err, "Failed to resend OTP"));
        } finally {
            setIsResending(false);
        }
    }

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
                            <Lock className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Verify OTP</h1>
                        <p className="text-gray-400">One-Time Password sent to your email</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Enter 6-digit Code</label>
                            <div className="relative group">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    maxLength="6"
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all tracking-widest text-center text-lg font-mono"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                        >
                            {isLoading ? "Verifying..." : "Verify Code"}
                        </button>
                    </form>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">
                        <button onClick={() => navigate(-1)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Change email
                        </button>

                        <button
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || isResending}
                            className={`text-sm font-medium transition-colors flex items-center gap-1 ${resendCooldown > 0 ? 'text-gray-500 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                            {isResending ? (
                                "Sending..."
                            ) : resendCooldown > 0 ? (
                                `Resend in ${resendCooldown}s`
                            ) : (
                                <>
                                    <RefreshCw className="w-3 h-3" /> Resend OTP
                                </>
                            )}
                        </button>
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
                            <Lock className="text-white w-8 h-8 rotate-6" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Security Verification
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter the code sent to {email}
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    One-Time Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ShieldCheck className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-lg transition-all tracking-widest"
                                        placeholder="------"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all uppercase tracking-wider disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Verifying..." : "Verify & Continue"}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex items-center justify-between">
                            <button onClick={() => navigate(-1)} className="text-sm font-medium text-gray-500 hover:text-emerald-600">
                                Change Email
                            </button>
                            <button
                                onClick={handleResendOtp}
                                disabled={resendCooldown > 0 || isResending}
                                className={`text-sm font-medium transition-colors ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-500'}`}
                            >
                                {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------------------
    // USER LAYOUT
    // ----------------------------------------------------------------------
    return (
        <div className="bg-[#f1f3f6] min-h-screen py-8 flex items-center justify-center">
            <div className="bg-white rounded-[4px] shadow-lg flex flex-col md:flex-row w-full max-w-[800px] h-auto md:h-[500px] overflow-hidden mx-4">

                {/* --- Left Panel --- */}
                <div className="bg-brand-orange text-white p-8 md:w-[40%] flex flex-col justify-between relative bg-no-repeat bg-bottom pb-12"
                    style={{ backgroundImage: 'url(https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png)', backgroundSize: 'contain' }}>
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Verify OTP</h2>
                        <p className="text-[#dbdbdb] text-base leading-6 font-medium">
                            We've sent a 6-digit OTP to <b>{email}</b>.
                        </p>
                    </div>
                </div>

                {/* --- Right Panel --- */}
                <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-center relative">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="relative">
                            <input
                                type="text"
                                maxLength="6"
                                className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent tracking-widest"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                disabled={isLoading}
                                autoFocus
                            />
                            <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                Enter 6-digit OTP
                            </label>
                        </div>

                        <button
                            disabled={isLoading}
                            className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? "Verifying..." : "Verify OTP"}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-gray-100 flex justify-between px-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm font-medium text-blue-500 hover:underline"
                        >
                            Change Email
                        </button>

                        <button
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || isResending}
                            className={`text-sm font-medium transition-colors ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-brand-orange hover:underline'}`}
                        >
                            {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOtp;
