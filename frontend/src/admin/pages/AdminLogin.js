import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, ShieldCheck } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AdminLogin = () => {
    const navigate = useNavigate();
    const { loginAdmin } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(
                `${API_BASE_URL}/admin/login`,
                { email, password },
                { withCredentials: true }
            );

            if (res.data.user) {
                if (res.data.token) {
                    localStorage.setItem("adminToken", res.data.token);
                }
                loginAdmin(res.data.user, res.data.token);
                toastSuccess(res.data.message || "Admin access granted");
                navigate("/admin/dashboard/");
            } else {
                toastError(res.data.message || "Authentication failed");
            }
        } catch (err) {
            toastError(axiosErrorMessage(err, "Login failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>

            <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
                        <ShieldCheck className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                    <p className="text-gray-400">Secure access for administrative tasks</p>
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
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                required
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="text-right mt-2">
                            <Link to="/forgot-password?role=admin" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Forgot Password?</Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mt-4"
                    >
                        {loading ? "Authenticating..." : "Sign In to Dashboard"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Protected by industry-standard encryption.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
