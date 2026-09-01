import React, { useState } from "react";
// import "./AuthModal.css"; // Removing external CSS dependency for pure Tailwind if possible, or keeping minimal
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AuthModal = ({ isOpen, onClose }) => {
  const { loginUser } = useAuth();

  // view: 'login' | 'signup' | 'signup_otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'
  const [view, setView] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // Added confirmPassword state
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false); // Added generic loading state

  // Reset Token for in-modal flow
  const [resetToken, setResetToken] = useState(null);

  // Resend OTP Logic
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  if (!isOpen) return null;

  // ----------------- HELPERS -----------------
  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword(""); // Reset confirmPassword
    setOtp("");
    setErrors({});
    setIsLoading(false);
    setResendCooldown(0); // Reset timer
    setResetToken(null);
  };

  const switchView = (newView) => {
    resetForm();
    setView(newView);
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return "";
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;

    if (strength <= 1) return { label: "Weak", color: "text-red-500" };
    if (strength === 2) return { label: "Medium", color: "text-yellow-500" };
    if (strength >= 3) return { label: "Strong", color: "text-green-500" };
    return { label: "", color: "" };
  };

  // ----------------- HANDLERS -----------------

  // Handler for Timer (Use simple interval inside standard useEffect if we want, or just decrement)
  // Since we are in a functional component that re-renders, we need to be careful.
  // We'll use a useEffect to decrement cooldown if it > 0
  // Note: This must be separate effect
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // React.useEffect(() => {
  //   if (resendCooldown > 0) {
  //     const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email, role: 'user' });
      toastSuccess(`New OTP sent to ${email}`);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      toastError(axiosErrorMessage(err, "Failed to resend OTP"));
    } finally {
      setIsResending(false);
    }
  }


  // 1. LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = "Please enter valid Email ID";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Please enter valid Email ID";
    if (!password) newErrors.password = "Please enter Password";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/users/login`, { email, password });
      loginUser(res.data.user, res.data.token);
      toastSuccess(`Welcome back, ${res.data.user.name.split(" ")[0]}!`);
      window.dispatchEvent(new CustomEvent('userLoggedIn'));
      onClose();
    } catch (err) {
      toastError(axiosErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SIGNUP - SEND OTP
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name) newErrors.name = "Please enter Name";
    if (!email) newErrors.email = "Please enter valid Email ID";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Please enter valid Email ID";
    if (!password) newErrors.password = "Please enter Password";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/users/send-otp`, { name, email, password });
      // toastSuccess("OTP sent to your email!"); // Removed generic message
      toastSuccess(res.data.message);
      setView("signup_otp");
    } catch (err) {
      toastError(axiosErrorMessage(err, "Signup failed"));
    } finally {
      setIsLoading(false);
    }
  };

  // 3. SIGNUP - VERIFY OTP
  const handleSignupOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      setErrors({ otp: "Please enter OTP" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/users/verify-otp`, { email, otp });
      loginUser(res.data.user, res.data.token);
      toastSuccess("Signup successful!");
      window.dispatchEvent(new CustomEvent('userLoggedIn'));
      onClose();
    } catch (err) {
      toastError(axiosErrorMessage(err, "OTP verification failed"));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. FORGOT PASSWORD - SEND OTP
  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: "Please enter your registered email" });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Sending Forgot Password Request:", { email, role: 'user' });
      await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email, role: 'user' });
      // toastSuccess("OTP sent to your email"); // Removed generic message
      toastSuccess(`OTP sent to ${email}`);
      setView("forgot_otp");
    } catch (err) {
      console.error("Forgot Password Error Response:", err.response);
      toastError(axiosErrorMessage(err, "Failed to send OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. FORGOT PASSWORD - VERIFY OTP
  const handleForgotOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      setErrors({ otp: "Please enter OTP" });
      return;
    }

    setIsLoading(true);
    try {
      // Verify OTP and get Token
      const res = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, { email, otp, role: 'user' });
      toastSuccess("OTP Verified!");

      setResetToken(res.data.token); // Store token for next step
      setView("forgot_reset");
    } catch (err) {
      toastError(axiosErrorMessage(err, "Invalid OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. FORGOT PASSWORD - RESET PASSWORD
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!password) {
      newErrors.password = "Enter new password";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one number";
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      newErrors.password = "Password must contain at least one special character";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        token: resetToken,
        role: 'user',
        newPassword: password,
        email // Optional, but good for validation if backend checks it
      });
      toastSuccess("Password reset successfully. Please login.");
      switchView("login");
    } catch (err) {
      toastError(axiosErrorMessage(err, "Failed to reset password"));
    } finally {
      setIsLoading(false);
    }
  };


  // ----------------- RENDER HELPERS -----------------
  const getLeftPanelContent = () => {
    if (view === 'login') {
      return {
        title: "Login",
        text: "Get access to your Orders, Wishlist and Recommendations"
      };
    }
    if (view.startsWith('signup')) {
      return {
        title: "Looks like you're new here!",
        text: "Sign up with your mobile number to get started"
      };
    }
    if (view.startsWith('forgot')) {
      return {
        title: "Forgot Password?",
        text: "Enter your details to reset your password"
      };
    }
    return { title: "", text: "" };
  };

  const leftPanel = getLeftPanelContent();
  const passwordStrength = getPasswordStrength(password);


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-[2px]">
      <div className="bg-white rounded-[4px] shadow-xl flex flex-col md:flex-row w-full max-w-[800px] h-auto md:h-[500px] overflow-hidden relative">

        {/* Close Button (Mobile) */}
        <button onClick={onClose} className="absolute top-2 right-2 md:hidden text-gray-500 z-10 p-2">
          ✕
        </button>

        {/* --- Left Panel (Blue) --- */}
        <div className="bg-brand-orange text-white p-8 md:w-[40%] flex flex-col justify-between relative bg-no-repeat bg-bottom pb-12"
          style={{ backgroundImage: 'url(https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png)', backgroundSize: 'contain' }}>
          <div>
            <h2 className="text-2xl font-bold mb-4">{leftPanel.title}</h2>
            <p className="text-[#dbdbdb] text-base leading-6 font-medium">
              {leftPanel.text}
            </p>
          </div>
        </div>

        {/* --- Right Panel (Form) --- */}
        <div className="bg-white p-8 md:p-10 md:w-[60%] flex flex-col justify-between relative">
          {/* Close Button (Desktop) */}
          <button onClick={onClose} className="absolute top-2 right-4 text-gray-400 hover:text-gray-600 text-2xl hidden md:block">
            ✕
          </button>

          <div className="flex-1 flex flex-col justify-center">

            {/* 1. LOGIN FORM */}
            {view === 'login' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    type="text"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="Enter Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    Enter Password
                  </label>
                  {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                  <div className="text-right mt-2">
                    <button type="button" onClick={() => switchView('forgot_email')} className="font-medium text-brand-orange hover:underline text-xs">
                      Forgot password?
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  By continuing, you agree to Flipkart's <span className="text-brand-orange">Terms of Use</span> and <span className="text-brand-orange">Privacy Policy</span>.
                </p>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </form>
            )}

            {/* 2. SIGNUP FORM */}
            {view === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="flex flex-col gap-5">
                <div className="relative">
                  <input
                    type="text"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="Enter Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    Set Password
                  </label>
                  {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                </div>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] mt-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Processing..." : "Continue"}
                </button>
              </form>
            )}

            {/* 3. SIGNUP OTP FORM */}
            {view === 'signup_otp' && (
              <form onSubmit={handleSignupOtpSubmit} className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    type="text"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    Enter OTP sent to {email}
                  </label>
                  {errors.otp && <span className="text-xs text-red-500 mt-1 block">{errors.otp}</span>}
                </div>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Verifying..." : "Signup"}
                </button>
              </form>
            )}

            {/* 4. FORGOT EMAIL FORM */}
            {view === 'forgot_email' && (
              <form onSubmit={handleForgotEmailSubmit} className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    type="text"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="Enter Registered Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    Enter Registered Email
                  </label>
                  {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                </div>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Sending..." : "Request OTP"}
                </button>

                <div className="text-center">
                  <button type="button" onClick={() => switchView('login')} className="text-sm font-medium text-brand-orange hover:underline">
                    Back to Login
                  </button>
                </div>
              </form>
            )}

            {/* 5. FORGOT OTP FORM */}
            {view === 'forgot_otp' && (
              <form onSubmit={handleForgotOtpSubmit} className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    type="text"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    Enter OTP sent to {email}
                  </label>
                  {errors.otp && <span className="text-xs text-red-500 mt-1 block">{errors.otp}</span>}
                </div>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isResending}
                    className={`text-xs font-semibold ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-brand-orange hover:underline'}`}
                  >
                    {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* 6. FORGOT RESET FORM */}
            {view === 'forgot_reset' && (
              <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-6">

                {/* New Password */}
                <div className="relative">
                  <input
                    type="password"
                    className="peer w-full border-b border-gray-300 py-2 text-sm text-gray-900 focus:border-brand-orange focus:outline-none placeholder-transparent"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <label className="absolute left-0 -top-3 text-xs text-gray-500 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-3 peer-focus:text-xs peer-focus:text-brand-orange">
                    New Password (Min 8 chars, A-Z, 0-9, Special)
                  </label>
                  {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                  {password && !errors.password && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${passwordStrength.color.replace('text', 'bg')} w-full`} style={{ width: passwordStrength.label === 'Weak' ? '33%' : passwordStrength.label === 'Medium' ? '66%' : '100%' }}></div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold ${passwordStrength.color}`}>{passwordStrength.label}</span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
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
                  {errors.confirmPassword && <span className="text-xs text-red-500 mt-1 block">{errors.confirmPassword}</span>}
                </div>

                <button
                  disabled={isLoading}
                  className={`bg-brand-orange text-white font-semibold py-3 rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition text-[15px] ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? "Resetting..." : "Set Password"}
                </button>
              </form>
            )}

          </div>

          {/* Footer / Switch Mode */}
          {/* Only show 'New to Flipkart' / 'Existing User' toggle if we are in main flows, not deep in forgot flow */}
          {['login', 'signup'].includes(view) && (
            <div className="mt-6 text-center">
              {view === 'login' ? (
                <p className="text-sm font-medium text-brand-orange cursor-pointer mt-4" onClick={() => switchView('signup')}>
                  New to Flipkart? Create an account
                </p>
              ) : (
                <button onClick={() => switchView('login')} className="w-full bg-white text-brand-orange font-semibold py-3 rounded-[2px] shadow-md border border-gray-200 text-[15px] hover:shadow-lg transition mt-4">
                  Existing User? Log in
                </button>
              )}
            </div>
          )}

          {/* Add back button for deep flows if needed, but handled in forms mostly */}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
