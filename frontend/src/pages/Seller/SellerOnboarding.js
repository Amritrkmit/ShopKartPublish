import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './SellerOnboarding.css';
import './components/SellerDesignSystem.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerOnboarding = () => {
    const [step, setStep] = useState(1);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("userToken"));

    useEffect(() => {
        const checkSellerStatus = async () => {
            const token = localStorage.getItem("userToken");
            if (!token) return;

            try {
                const res = await fetch(`${API_BASE_URL}/sellers/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id) {
                        // Already a seller, go to dashboard
                        window.location.href = "/seller/dashboard";
                    }
                }
            } catch (err) { }
        };

        checkSellerStatus();

        const handleLoginSuccess = () => {
            setIsLoggedIn(true);
            checkSellerStatus();
        };
        // Listen for onboarding success to refresh seller status
        window.addEventListener("userLoggedIn", handleLoginSuccess);
        return () => window.removeEventListener('userLoggedIn', handleLoginSuccess);
    }, []);
    const [formData, setFormData] = useState({
        business_name: '',
        business_type: 'individual',
        tax_id: '',
        shop_name: '',
        shop_description: '',
        city: '',
        pincode: '',
        address: '',
        bank_holder: '',
        bank_account: '',
        bank_name: '',
        ifsc: '',
    });

    const [files, setFiles] = useState({
        logo: null,
        identity_proof: null,
        tax_certificate: null,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        setFiles({ ...files, [name]: selectedFiles[0] });
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem("userToken");

        if (!token) {
            toast.error("You must be logged in to register as a seller.");
            return;
        }

        toast.info("Submitting your application...");

        const data = new FormData();
        // Append all text fields
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });
        // Append all files
        Object.keys(files).forEach(key => {
            if (files[key]) {
                data.append(key, files[key]);
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/sellers/onboarding`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: data
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Application submitted successfully! Redirecting to your profile...");
                // Reload user profile info if needed or just redirect
                setTimeout(() => {
                    window.location.href = "/account/profile";
                }, 2000);
            } else {
                toast.error(result.message || "Failed to submit application.");
            }
        } catch (error) {
            console.error("❌ Submission error:", error);
            // Help the user see the actual error message if it's available
            const errorMessage = error.message || "An error occurred while submitting. Please try again.";
            toast.error(errorMessage);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="seller-onboarding-container auth-required seller-dashboard-root">
                <div className="onboarding-card auth-card">
                    <div className="auth-icon">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#FF7A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M19 8v6M22 11h-6" />
                        </svg>
                    </div>
                    <h1>Join our Seller Community</h1>
                    <p>Log in to your account to start your journey as a seller on Shopkart.</p>
                    <div className="auth-actions">
                        <button className="secondary-btn" onClick={() => window.location.href = "/"}>Back to Shopping</button>
                        <button className="primary-btn" onClick={() => window.dispatchEvent(new CustomEvent('openLoginModal'))}>
                            Login Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="onboarding-step">
                        <h2>Business Details</h2>
                        <div className="form-group">
                            <label>Business Name</label>
                            <input type="text" name="business_name" value={formData.business_name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Business Type</label>
                            <select name="business_type" value={formData.business_type} onChange={handleInputChange}>
                                <option value="individual">Individual / Proprietorship</option>
                                <option value="company">Limited / Pvt Ltd Company</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tax ID (GST/VAT)</label>
                            <input type="text" name="tax_id" value={formData.tax_id} onChange={handleInputChange} required />
                        </div>
                        <button className="primary-btn" onClick={nextStep}>Next: Shop Profile</button>
                    </div>
                );
            case 2:
                return (
                    <div className="onboarding-step">
                        <h2>Shop Profile</h2>
                        <div className="form-group">
                            <label>Shop Name</label>
                            <input type="text" name="shop_name" value={formData.shop_name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Shop Description</label>
                            <textarea name="shop_description" value={formData.shop_description} onChange={handleInputChange} rows="3" />
                        </div>
                        <div className="form-horizontal">
                            <div className="form-group">
                                <label>City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Pincode</label>
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Shop Logo</label>
                            <input type="file" name="logo" onChange={handleFileChange} accept="image/*" />
                        </div>
                        <div className="btn-group">
                            <button className="secondary-btn" onClick={prevStep}>Back</button>
                            <button className="primary-btn" onClick={nextStep}>Next: Payout Details</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="onboarding-step">
                        <h2>Bank Details (for Payouts)</h2>
                        <div className="form-group">
                            <label>Account Holder Name</label>
                            <input type="text" name="bank_holder" value={formData.bank_holder} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Account Number</label>
                            <input type="text" name="bank_account" value={formData.bank_account} onChange={handleInputChange} required />
                        </div>
                        <div className="form-horizontal">
                            <div className="form-group">
                                <label>Bank Name</label>
                                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>IFSC Code</label>
                                <input type="text" name="ifsc" value={formData.ifsc} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="secondary-btn" onClick={prevStep}>Back</button>
                            <button className="primary-btn" onClick={nextStep}>Next: Verification</button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="onboarding-step">
                        <h2>Verify documents</h2>
                        <p className="step-info">Please upload your legal documents for verification.</p>
                        <div className="form-group">
                            <label>Identity Proof (Aadhar/Passport/ID)</label>
                            <input type="file" name="identity_proof" onChange={handleFileChange} required />
                        </div>
                        <div className="form-group">
                            <label>Tax Registration Certificate</label>
                            <input type="file" name="tax_certificate" onChange={handleFileChange} required />
                        </div>
                        <div className="terms-checkbox">
                            <input type="checkbox" id="terms" required />
                            <label htmlFor="terms">I agree to the Seller Terms & Conditions</label>
                        </div>
                        <div className="btn-group">
                            <button className="secondary-btn" onClick={prevStep}>Back</button>
                            <button className="primary-btn submit" onClick={handleSubmit}>Submit Application</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="seller-onboarding-container seller-dashboard-root">
            <div className="onboarding-card">
                <div className="onboarding-header">
                    <h1>Become a Seller</h1>
                    <p>Reach millions of customers by starting your shop today.</p>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
                        <div className="step-indicators">
                            <span className={step >= 1 ? 'active' : ''}>1</span>
                            <span className={step >= 2 ? 'active' : ''}>2</span>
                            <span className={step >= 3 ? 'active' : ''}>3</span>
                            <span className={step >= 4 ? 'active' : ''}>4</span>
                        </div>
                    </div>
                </div>
                <div className="onboarding-body">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
};

export default SellerOnboarding;
