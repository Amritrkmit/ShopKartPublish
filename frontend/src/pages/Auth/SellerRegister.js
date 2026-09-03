import React, { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Store, User, Building2, MapPin, Landmark, FileText } from "lucide-react";
import { API_BASE_URL } from "../../config";

const SellerRegister = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "", email: "", password: "",
        business_name: "", business_type: "individual", tax_id: "",
        shop_name: "", shop_description: "", city: "", pincode: "", address: "",
        bank_holder: "", bank_account: "", bank_name: "", ifsc: ""
    });

    const [files, setFiles] = useState({
        logo: null, identity_proof: null, tax_certificate: null
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFiles({ ...files, [e.target.name]: e.target.files[0] });
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        Object.keys(files).forEach(key => {
            if (files[key]) data.append(key, files[key]);
        });

        try {
            await axios.post(`${API_BASE_URL}/api/sellers/register`, data);
            toastSuccess("Registration successful! Please login to your dashboard.");
            navigate("/seller/login/");
        } catch (err) {
            toastError(axiosErrorMessage(err, "Registration failed"));
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                        <Store className="text-white w-8 h-8 rotate-6" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Seller Registration
                </h2>
                <div className="mt-4 flex justify-center space-x-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`w-8 h-1 rounded-full ${step >= s ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-2xl sm:px-10">

                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <User size={20} className="text-emerald-600" /> Account Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input type="text" name="name" required className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500" value={formData.name} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Business Email</label>
                                    <input type="email" name="email" required className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" name="password" required className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500" value={formData.password} onChange={handleChange} />
                                </div>
                            </div>
                            <button onClick={nextStep} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700">Next Step</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Building2 size={20} className="text-emerald-600" /> Business Info
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                                    <input type="text" name="business_name" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-emerald-500 focus:border-emerald-500" value={formData.business_name} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                                    <select name="business_type" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.business_type} onChange={handleChange}>
                                        <option value="individual">Individual</option>
                                        <option value="company">Company</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">GST/Tax ID</label>
                                    <input type="text" name="tax_id" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.tax_id} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                                    <input type="text" name="shop_name" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.shop_name} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold">Back</button>
                                <button onClick={nextStep} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <MapPin size={20} className="text-emerald-600" /> Location & Bank
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <input type="text" name="address" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.address} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <input type="text" name="city" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.city} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pincode</label>
                                    <input type="text" name="pincode" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.pincode} onChange={handleChange} />
                                </div>
                                <div className="md:col-span-2 border-t pt-4 mt-2">
                                    <h4 className="font-bold text-sm text-gray-600 mb-2 flex gap-2 items-center"><Landmark size={16} /> Bank Details</h4>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                    <input type="text" name="bank_account" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.bank_account} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                                    <input type="text" name="ifsc" className="mt-1 block w-full border border-gray-300 rounded-xl px-4 py-3" value={formData.ifsc} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold">Back</button>
                                <button onClick={nextStep} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Next</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <FileText size={20} className="text-emerald-600" /> Documents
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Shop Logo</label>
                                    <input type="file" name="logo" onChange={handleFileChange} className="mt-1 block w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Identity Proof</label>
                                    <input type="file" name="identity_proof" onChange={handleFileChange} className="mt-1 block w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tax Certificate</label>
                                    <input type="file" name="tax_certificate" onChange={handleFileChange} className="mt-1 block w-full" />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={prevStep} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold">Back</button>
                                <button onClick={handleRegisterSubmit} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold tracking-wider uppercase">
                                    {loading ? "Registering..." : "Finalize Registration"}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 border-t border-gray-100 pt-6">
                        <p className="text-center text-sm text-gray-600">
                            Already have a merchant account?
                            <Link to="/seller/login/" className="ml-2 font-medium text-emerald-600 hover:text-emerald-500">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400">
                Official Merchant Portal • &copy; {new Date().getFullYear()} ShopKart Inc.
            </div>
        </div>
    );
};

export default SellerRegister;
