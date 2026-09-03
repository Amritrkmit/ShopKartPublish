import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config";

const UserRegister = () => {
    const navigate = useNavigate();
    const { loginUser } = useAuth();
    const [step, setStep] = useState("form");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [errors, setErrors] = useState({});

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!name) newErrors.name = "Please enter Name";
        if (!email) newErrors.email = "Please enter valid Email ID";
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Please enter valid Email ID";
        if (!password) newErrors.password = "Please enter Password";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        try {
            await axios.post(`${API_BASE_URL}/users/send-otp`, { name, email, password });
            toastSuccess("OTP sent to your email!");
            setStep("otp");
        } catch (err) {
            toastError(axiosErrorMessage(err, "Signup failed"));
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (!otp) {
            setErrors({ otp: "Please enter OTP" });
            return;
        }

        try {
            const res = await axios.post(`${API_BASE_URL}/users/verify-otp`, { email, otp }, { withCredentials: true });
            loginUser(res.data.user); // Token in cookie
            toastSuccess("Signup successful!");
            navigate("/");
        } catch (err) {
            toastError(axiosErrorMessage(err, "OTP verification failed"));
        }
    };

    return (
        <div className="bg-[#f1f3f6] min-h-screen py-8 flex items-center justify-center">
            <div className="bg-white rounded-[4px] shadow-lg flex flex-col md:flex-row w-full max-w-[800px] h-auto md:h-[500px] overflow-hidden mx-4">

                {/* --- Left Panel (Blue) --- */}
                <div className="bg-brand-orange text-white p-8 md:w-[40%] flex flex-col justify-between relative bg-no-repeat bg-bottom pb-12"
                    style={{ backgroundImage: 'url(https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png)', backgroundSize: 'contain' }}>
                    <div>
                        <h2 className="text-2xl font-bold mb-4">
                            {step === "form" ? "Sign Up" : "Verify OTP"}
                        </h2>
                        <p className="text-[#dbdbdb] text-base leading-6 font-medium">
                            Sign up to get started
                        </p>
                    </div>
                </div>

                {/* --- Right Panel (Form) --- */}
                <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-between relative">

                    <div className="flex-1 flex flex-col justify-center">

                        {step === "form" && (
                            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-5">
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                        placeholder="Enter Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                        Enter Name
                                    </label>
                                    {errors.name && <span className="text-xs text-red-500 mt-1 block">{errors.name}</span>}
                                </div>

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
                                        placeholder="Set Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                        Set Password
                                    </label>
                                    {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                                </div>


                                <button className="bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] mt-2">
                                    Continue
                                </button>
                            </form>
                        )}

                        {step === "otp" && (
                            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                                        placeholder="Enter OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                    <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                                        Enter OTP sent to {email}
                                    </label>
                                    {errors.otp && <span className="text-xs text-red-500 mt-1 block">{errors.otp}</span>}
                                </div>

                                <button className="bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px]">
                                    Signup
                                </button>
                            </form>
                        )}

                        <div className="mt-6 text-center">
                            <Link to="/login/" className="w-full block bg-white text-brand-orange font-semibold py-3 rounded-[2px] shadow-md border border-gray-200 text-[15px] hover:shadow-lg transition mt-4">
                                Existing User? Log in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserRegister;
