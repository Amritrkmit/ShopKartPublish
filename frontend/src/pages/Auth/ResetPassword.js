import React, { useState, useEffect } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Store, Lock, Check } from "lucide-react";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Support two modes: Legacy (email+otp) for deep links if needed, though we moved to token.
    // New Mode: token + role
    const token = searchParams.get("token");
    const role = searchParams.get("role") || "user";
    // Keeping email/otp logic for safety if user is mid-flow during deploy, but token is primary.
    const email = searchParams.get("email");
    const otp = searchParams.get("otp");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // If neither token nor (email+otp) is present
        if (!token && (!email || !otp)) {
            toastError("Invalid access. Please start from Forgot Password.");
            navigate("/forgot-password");
        }
    }, [token, email, otp, navigate]);

    const getPasswordStrength = (pass) => {
        if (!pass) return "";
        let strength = 0;
        if (pass.length >= 8) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;

        if (strength <= 1) return { label: "Weak", color: "text-red-500", bg: "bg-red-500" };
        if (strength === 2) return { label: "Medium", color: "text-yellow-500", bg: "bg-yellow-500" };
        if (strength >= 3) return { label: "Strong", color: "text-green-500", bg: "bg-green-500" };
        return { label: "", color: "", bg: "" };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            toastError("Password must be at least 8 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            toastError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/reset-password`, {
                token,
                // Fallback for transition period or if token is missing but email/otp present
                email,
                otp,
                role,
                newPassword
            });
            toastSuccess("Password has been reset successfully!");
            navigate(role === 'seller' ? "/seller/login/" : role === 'admin' ? "/admin/login" : "/login/");
        } catch (err) {
            toastError(axiosErrorMessage(err, "Failed to reset password"));
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
                            <Check className="text-white w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                        <p className="text-gray-400">Create a strong new password</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">New Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            {newPassword && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`h-full ${passwordStrength.bg} transition-all duration-300`} style={{ width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%' }}></div>
                                    </div>
                                    <span className={`text-[11px] uppercase font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                        >
                            {isLoading ? "Updating..." : "Set New Password"}
                        </button>
                    </form>
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
                        Create New Password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Your new password must be different from previous used passwords
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    New Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                {newPassword && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${passwordStrength.bg} transition-all duration-300`} style={{ width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%' }}></div>
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Confirm Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                                    {isLoading ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
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
                        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
                        <p className="text-[#dbdbdb] text-base leading-6 font-medium">
                            Set a new strong password for your account.
                        </p>
                    </div>
                </div>

                {/* --- Right Panel --- */}
                <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-center relative">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="relative">
                            <input
                                type="password"
                                className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                New Password (Min 8 chars)
                            </label>
                            {newPassword && (
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${passwordStrength.bg} w-full transition-all duration-300`} style={{ width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%' }}></div>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <input
                                type="password"
                                className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                            />
                            <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                Confirm Password
                            </label>
                        </div>

                        <button
                            disabled={isLoading}
                            className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? "Resetting..." : "Set Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
