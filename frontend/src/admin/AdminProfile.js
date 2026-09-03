import { useState, useEffect } from "react";
import axios from "axios";
import { Lock, User, Mail, Shield } from "lucide-react";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function AdminProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    profilePic: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  // Fetch profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/admin/profile`, {
          withCredentials: true,
        });
        setProfile(res.data);
      } catch (err) {
        console.error("Error fetching profile", err);
      }
    };
    fetchProfile();
  }, []);

  // Update profile info
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await axios.put(`${API_BASE_URL}/admin/profile`, profile, {
        withCredentials: true,
      });
      setMsg("Profile updated successfully ✅");
    } catch (err) {
      setMsg(err.response?.data?.message || "Profile update failed ❌");
    }
    setLoading(false);
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordMsg("");
    try {
      await axios.put(`${API_BASE_URL}/admin/profile/password`, passwords, {
        withCredentials: true,
      });
      setPasswordMsg("Password updated successfully ✅");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPasswordMsg(err.response?.data?.message || "Password change failed ❌");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-gray-900 font-medium">Profile Settings</span>
            </div>
            {/* Global Actions (Visual Only since forms are separate) */}
            <div className="text-sm text-gray-500">
              Manage your account settings and security
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                Personal Information
              </h3>

              {msg && <div className={`mb-4 p-3 rounded text-sm ${msg.includes('success') || msg.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{msg}</div>}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400"><User size={16} /></span>
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400"><Mail size={16} /></span>
                    <input
                      type="email"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Update Profile"}
                  </button>
                </div>
              </form>
            </div>

            {/* Role Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-purple-600" />
                Role & Permissions
              </h3>
              <div className="flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">
                <span className="font-semibold uppercase text-xs tracking-wider bg-white px-2 py-1 rounded border border-purple-200">
                  {profile.role || 'ADMIN'}
                </span>
                <span className="text-sm">You have full administrative access to this dashboard.</span>
              </div>
            </div>
          </div>


          {/* Right Column - Security */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Lock size={18} className="text-orange-500" />
                Security
              </h3>

              {passwordMsg && <div className={`mb-4 p-3 rounded text-sm ${passwordMsg.includes('success') || passwordMsg.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{passwordMsg}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full px-5 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
