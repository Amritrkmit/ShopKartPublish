import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/login`,
        { email, password },
        { withCredentials: true } // important for cookie
      );

      if (res.data.user) {
        // Save user info in localStorage (optional)
        localStorage.setItem("adminUser", JSON.stringify(res.data.user));
        toastSuccess(res.data.message || "Login successful");
        navigate("/admin/dashboard/");
      } else {
        toastError(res.data.message || "Login failed 111");
        setError(res.data.message || "Login failed 111");
      }
    } catch (err) {
      toastError(axiosErrorMessage(err));
      setError(err.response?.data?.message || "Login failed 222");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}


