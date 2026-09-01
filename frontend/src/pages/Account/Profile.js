import React, { useEffect, useState } from "react";
import axios from "axios";
import { Crown } from "lucide-react";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import AccountLayout from "./AccountLayout";
import { useAuth } from "../../context/AuthContext";
import { toastSuccess, toastError } from "../../utils/toast";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [superCoinInfo, setSuperCoinInfo] = useState({ balance: 0 });
  const [error, setError] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        // setError("You are not logged in");
        return;
      }

      try {
        const profileRes = await axios.get(`${API_BASE_URL}/users/me`, {
          withCredentials: true
        });
        setProfile(profileRes.data);

        const coinsRes = await axios.get(`${API_BASE_URL}/users/me/supercoins`, {
          withCredentials: true
        });
        setSuperCoinInfo(coinsRes.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch profile");
      }
    };

    fetchProfile();
  }, [user]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  useEffect(() => {
    if (profile) setFormData({ name: profile.name, email: profile.email });
  }, [profile]);

  const handleSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/users/me`, formData, {
        withCredentials: true
      });
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toastSuccess("Profile Updated Successfully!");
    } catch (err) {
      toastError(err.response?.data?.message || "Failed to update profile");
    }
  };

  if (error) return <AccountLayout><p className="text-red-500">{error}</p></AccountLayout>;
  if (!profile) return <AccountLayout><p>Loading...</p></AccountLayout>;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'My Account' }
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <AccountLayout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Personal Information</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="text-blue-600 font-medium hover:underline">Edit</button>
          )}
        </div>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-500">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                className="w-full p-2 border rounded mt-1"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded-lg border text-gray-800 font-medium my-2">
                {profile.name}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email Address</label>
            {isEditing ? (
              <input
                type="email"
                className="w-full p-2 border rounded mt-1"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            ) : (
              <div className="bg-gray-50 p-3 rounded-lg border text-gray-800 font-medium my-2">
                {profile.email}
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                  Save Changes
                </button>
                <button onClick={() => { setIsEditing(false); setFormData({ name: profile.name, email: profile.email }); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
                Edit Profile
              </button>
            )}
          </div>

          {/* Rewards Card */}
          <div
            onClick={() => window.location.href = '/account/supercoins'}
            className="mt-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl p-6 text-white shadow-xl max-w-lg cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-orange-100 text-xs font-black uppercase tracking-widest mb-1">Your Rewards</p>
                <h3 className="text-2xl font-black">SuperCoin Balance</h3>
              </div>
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Crown className="w-6 h-6 fill-current" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-black">{superCoinInfo?.balance || 0}</div>
              <div className="h-10 w-[1px] bg-white/30"></div>
              <div>
                <p className="text-sm font-bold opacity-90">Order-based Rewards</p>
                <p className="text-[10px] uppercase font-black opacity-70 tracking-tighter">View History & Expiry →</p>
              </div>
            </div>
          </div>
        </div>
      </AccountLayout>
    </>
  );
};

export default Profile;
