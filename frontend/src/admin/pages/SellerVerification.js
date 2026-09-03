import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toastSuccess, toastError, axiosErrorMessage } from '../../utils/toast';
import './SellerVerification.css';

const SellerVerification = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

    const fetchSellers = useCallback(async () => {
        setLoading(true);
        try {
            const adminBaseUrl = (API_BASE_URL || '').replace('/api', '');
            const response = await axios.get(`${adminBaseUrl}/admin/verifications`, {
                withCredentials: true
            });
            setSellers(response.data);
        } catch (error) {
            console.error("Fetch error:", error);
            toastError(axiosErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchSellers();
    }, [fetchSellers]);

    const [selectedSeller, setSelectedSeller] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchDetails = async (seller) => {
        setDetailsLoading(true);
        setSelectedSeller(seller); // Show basic info first
        try {
            const adminBaseUrl = API_BASE_URL.replace('/api', '');
            const response = await axios.get(`${adminBaseUrl}/admin/verifications/${seller.id}`, {
                withCredentials: true
            });
            setSelectedSeller(response.data);
        } catch (error) {
            toastError("Failed to fetch seller details");
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        try {
            const adminBaseUrl = API_BASE_URL.replace('/api', '');
            const response = await axios.post(`${adminBaseUrl}/admin/verifications/${id}`,
                { action, remarks },
                { withCredentials: true }
            );

            toastSuccess(response.data.message);
            fetchSellers(); // Refresh list
            setSelectedSeller(null);
            setRemarks('');
        } catch (error) {
            toastError(axiosErrorMessage(error));
        }
    };

    return (
        <div className="admin-verification-container">
            <div className="admin-header">
                <h1>Seller Verification Dashboard</h1>
                <p>Manage and verify multi-seller applications.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card pending">
                    <h3>Pending</h3>
                    <p>{sellers.filter(s => s.status === 'PENDING_VERIFICATION' || s.status === 'SUBMITTED').length}</p>
                </div>
                <div className="stat-card approved">
                    <h3>Approved</h3>
                    <p>{sellers.filter(s => s.status === 'APPROVED').length}</p>
                </div>
                <div className="stat-card rejected">
                    <h3>Rejected</h3>
                    <p>{sellers.filter(s => s.status === 'REJECTED').length}</p>
                </div>
            </div>

            <div className="verification-table-wrapper">
                {loading ? (
                    <div className="loading-state">Loading sellers...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="verification-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Business Name</th>
                                    <th>Owner</th>
                                    <th>City</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sellers.map((seller) => (
                                    <tr key={seller.id}>
                                        <td>#{seller.id}</td>
                                        <td>
                                            <div className="business-cell">
                                                <strong>{seller.business_name}</strong>
                                                <span className="shop-name">{seller.shop_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="owner-cell">
                                                {seller.owner_name}
                                                <small>{seller.owner_email}</small>
                                            </div>
                                        </td>
                                        <td>{seller.city}</td>
                                        <td>
                                            <span className={`status-badge ${seller.status.toLowerCase()}`}>
                                                {seller.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{new Date(seller.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="view-btn" onClick={() => fetchDetails(seller)}>View Details</button>
                                        </td>
                                    </tr>
                                ))}
                                {sellers.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No seller applications found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedSeller && (
                <div className="verification-modal-overlay">
                    <div className="verification-modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="text-xl font-bold">Review: {selectedSeller.business_name}</h2>
                                <p className="text-xs text-gray-500">ID: #{selectedSeller.id} | Applied: {new Date(selectedSeller.created_at).toLocaleDateString()}</p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedSeller(null)}>&times;</button>
                        </div>
                        <div className="modal-body overflow-y-auto max-h-[70vh]">
                            {detailsLoading ? (
                                <div className="p-12 text-center text-gray-500">Loading details...</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="detail-section">
                                            <h3>Business Info</h3>
                                            <div className="space-y-2">
                                                <p><strong>Shop Name:</strong> {selectedSeller.shop_name}</p>
                                                <p className="capitalize"><strong>Type:</strong> {selectedSeller.business_type}</p>
                                                <p><strong>Tax ID:</strong> {selectedSeller.tax_id || 'N/A'}</p>
                                                <p><strong>Address:</strong> {selectedSeller.address_line1}, {selectedSeller.city}, {selectedSeller.state} - {selectedSeller.pincode}</p>
                                            </div>
                                        </div>

                                        <div className="detail-section">
                                            <h3>Owner Contact</h3>
                                            <div className="space-y-2">
                                                <p><strong>Name:</strong> {selectedSeller.owner_name}</p>
                                                <p><strong>Email:</strong> {selectedSeller.owner_email}</p>
                                                <p><strong>Phone:</strong> {selectedSeller.owner_phone || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {selectedSeller.bankDetails && (
                                            <div className="detail-section md:col-span-2 bg-gray-50 p-4 rounded-lg">
                                                <h3>Bank Details</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 uppercase text-[10px] font-bold">Holder Name</p>
                                                        <p className="font-medium">{selectedSeller.bankDetails.account_holder_name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 uppercase text-[10px] font-bold">Account Number</p>
                                                        <p className="font-medium">{selectedSeller.bankDetails.account_number}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 uppercase text-[10px] font-bold">IFSC / Branch</p>
                                                        <p className="font-medium">{selectedSeller.bankDetails.ifsc_code} ({selectedSeller.bankDetails.bank_name})</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="detail-section md:col-span-2">
                                            <h3>Verification Documents</h3>
                                            <div className="doc-links flex-wrap">
                                                {selectedSeller.documents?.length > 0 ? (
                                                    selectedSeller.documents.map((doc, idx) => {
                                                        const docUrl = doc.document_url.startsWith('http')
                                                            ? doc.document_url
                                                            : `${API_BASE_URL.replace('/api', '')}${doc.document_url}`;
                                                        return (
                                                            <a key={idx} href={docUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                                                <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                                                            </a>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No documents uploaded</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-section mt-8 border-t pt-6">
                                        <h3>Admin Decision</h3>
                                        <textarea
                                            placeholder="Add internal remarks or reasons for rejection..."
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="w-full min-h-[100px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <div className="modal-actions mt-4">
                                            <button className="reject-btn" onClick={() => handleAction(selectedSeller.id, 'REJECT')}>Reject</button>
                                            <button className="change-btn" onClick={() => handleAction(selectedSeller.id, 'REQUIRE_CHANGES')}>Need Changes</button>
                                            <button className="approve-btn" onClick={() => handleAction(selectedSeller.id, 'APPROVE')}>Approve Seller</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerVerification;
