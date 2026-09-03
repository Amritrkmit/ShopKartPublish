import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config";



const UserLogin = () => {
    const navigate = useNavigate();
    const { loginUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!email) newErrors.email = "Please enter valid Email ID";
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Please enter valid Email ID";
        if (!password) newErrors.password = "Please enter Password";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            const res = await axios.post(`${API_BASE_URL}/users/login`, { email, password }, { withCredentials: true });

            if (res.data.token) {
                localStorage.setItem("userToken", res.data.token);
            }

            // Immediately update state and then navigate
            loginUser(res.data); // Passes { user, token }
            toastSuccess(`Welcome back, ${res.data.user.name.split(" ")[0]}!`);

            // Small delay to ensure state is committed before hitting RoleRoute
            setTimeout(() => {
                navigate("/");
            }, 50);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                toastError(err.response.data.message);
            } else {
                toastError(axiosErrorMessage(err, "Login failed"));
            }
        }
    };

    return (
        <div className="bg-[#f1f3f6] min-h-screen py-8 flex items-center justify-center">
            <div className="bg-white rounded-[4px] shadow-lg flex flex-col md:flex-row w-full max-w-[800px] h-auto md:h-[500px] overflow-hidden mx-4">

                {/* --- Left Panel (Blue) --- */}
                <div className="bg-brand-orange text-white p-8 md:w-[40%] flex flex-col justify-between relative bg-no-repeat bg-bottom pb-12"
                    style={{ backgroundImage: 'url(https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png)', backgroundSize: 'contain' }}>
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Login</h2>
                        <p className="text-[#dbdbdb] text-base leading-6 font-medium">
                            Get access to your Orders, Wishlist and Recommendations
                        </p>
                    </div>
                </div>

                {/* --- Right Panel (Form) --- */}
                <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-between relative">

                    <div className="flex-1 flex flex-col justify-center">
                        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                    placeholder="Enter Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                    Enter Email
                                </label>
                                {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                            </div>

                            <div className="relative">
                                <input
                                    type="password"
                                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                    placeholder="Enter Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                    Enter Password
                                </label>
                                {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                                <div className="text-right mt-2">
                                    <Link to="/forgot-password?role=user" className="font-medium text-brand-orange hover:underline text-xs">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                By continuing, you agree to Flipkart's <span className="text-brand-orange">Terms of Use</span> and <span className="text-brand-orange">Privacy Policy</span>.
                            </p>

                            <button className="bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px]">
                                Login
                            </button>
                        </form>

                        <div className="mt-8 text-center pt-8 border-t border-gray-100">
                            <Link to="/register/" className="text-sm font-medium text-brand-orange hover:underline">
                                New to Flipkart? Create an account
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserLogin;
