import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toastSuccess, toastError, axiosErrorMessage } from '../../utils/toast';
import { Tag, Plus, Trash2, Calendar, UserPlus, StopCircle, CheckCircle, Users, Edit } from 'lucide-react';
import ConfirmationModal from '../../components/ConfirmationModal';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

// --- Sub-Components ---

const UserSelector = ({ users, selectedUsers, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectAll, setSelectAll] = useState(false);

    const filteredUsers = users.filter(u =>
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        u.email !== 'admin@gmail.com' // Hide admin
    );

    const handleToggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            onChange(selectedUsers.filter(id => id !== userId));
        } else {
            onChange([...selectedUsers, userId]);
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            onChange([]);
        } else {
            onChange(filteredUsers.map(u => u.id));
        }
        setSelectAll(!selectAll);
    };

    return (
        <div className="border rounded p-3 bg-gray-50">
            <input
                type="text"
                placeholder="Search users..."
                className="w-full border rounded p-2 mb-2 bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />

            <div className="flex items-center gap-2 mb-2">
                <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4"
                />
                <label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">Select All</label>
                <span className="text-xs text-gray-500 ml-auto">{selectedUsers.length} selected</span>
            </div>

            <div className="h-40 overflow-y-auto bg-white border rounded">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 border-b border-transparent hover:border-gray-100">
                        <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleToggleUser(u.id)}
                            className="w-4 h-4"
                        />
                        <div className="text-sm">
                            <p className="font-medium text-gray-800 m-0">{u.name}</p>
                            <p className="text-xs text-gray-500 m-0">{u.email}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-400 py-10">No users found</p>
                )}
            </div>
        </div>
    );
};

const CouponForm = ({ initialData, onClose, onRefresh, users, fetchUsers }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState(initialData || {
        code: '',
        discount_type: 'flat',
        discount_value: '',
        min_order_value: 0,
        description: '',
        valid_until: '',
        is_public: false
    });
    const [selectedUsers, setSelectedUsers] = useState([]);

    useEffect(() => {
        if (users.length === 0) fetchUsers();
    }, [users.length, fetchUsers]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEdit) {
                await axios.put(`${API_BASE_URL}/api/coupons/admin/${initialData.id}`, formData, { withCredentials: true });
                toastSuccess("Coupon Updated Successfully!");
            } else {
                // 1. Create Coupon
                const res = await axios.post(`${API_BASE_URL}/api/coupons/admin`, formData, { withCredentials: true });
                const newCouponId = res.data.id;

                // 2. Assign Users if selected
                if (selectedUsers.length > 0) {
                    await axios.post(`${API_BASE_URL}/api/coupons/admin/assign`,
                        { user_ids: selectedUsers, coupon_id: newCouponId },
                        { withCredentials: true }
                    );
                }
                toastSuccess("Coupon Created & Assigned!");
            }

            onRefresh();
            onClose();
        } catch (err) {
            toastError(axiosErrorMessage(err, isEdit ? "Failed to update" : "Failed to create"));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{isEdit ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Coupon Code</label>
                            <input type="text" required className="w-full border rounded p-2 uppercase font-mono"
                                value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder='WELCOME10'
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Valid Until</label>
                            <input type="date" className="w-full border rounded p-2"
                                value={formData.valid_until ? formData.valid_until.split('T')[0] : ''}
                                onChange={e => setFormData({ ...formData, valid_until: e.target.value })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select className="w-full border rounded p-2"
                                value={formData.discount_type} onChange={e => setFormData({ ...formData, discount_type: e.target.value })}>
                                <option value="flat">Flat Amount (₹)</option>
                                <option value="percentage">Percentage (%)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Value</label>
                            <input type="number" required className="w-full border rounded p-2"
                                value={formData.discount_value} onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                placeholder='500'
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Min Order Value (₹)</label>
                        <input type="number" className="w-full border rounded p-2"
                            value={formData.min_order_value} onChange={e => setFormData({ ...formData, min_order_value: e.target.value })} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea className="w-full border rounded p-2" rows="2"
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder='Short details for user...'
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t pt-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Visibility</label>
                            <label className="flex items-start gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 mt-0.5"
                                    checked={formData.is_public}
                                    onChange={e => {
                                        if (e.target.checked && !isEdit) setSelectedUsers([]); // Clear users if public
                                        setFormData({ ...formData, is_public: e.target.checked });
                                    }}
                                />
                                <div>
                                    <span className="font-medium text-gray-700 block">Public Coupon</span>
                                    <span className="text-xs text-gray-500">Visible to ALL users automatically via "My Coupons".</span>
                                </div>
                            </label>
                        </div>

                        {!formData.is_public && !isEdit && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Assign to Specific Users (Optional)</label>
                                <UserSelector users={users} selectedUsers={selectedUsers} onChange={setSelectedUsers} />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                            {isEdit ? 'Update Coupon' : (selectedUsers.length > 0 ? `Create & Assign to ${selectedUsers.length} Users` : 'Create Coupon')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AssignModal = ({ assignModal, setAssignModal, users, fetchUsers }) => {
    const [selectedUsers, setSelectedUsers] = useState([]);

    useEffect(() => {
        if (users.length === 0) fetchUsers();

        const fetchAssignedUsers = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/coupons/admin/${assignModal.couponId}/users`, { withCredentials: true });
                setSelectedUsers(res.data);
            } catch (err) {
                console.error("Failed to fetch assigned users");
            }
        };
        if (assignModal.couponId) fetchAssignedUsers();
    }, [assignModal.couponId, users.length, fetchUsers]);

    const handleAssign = async () => {
        if (selectedUsers.length === 0) return toastError("Please select at least one user");
        try {
            await axios.post(`${API_BASE_URL}/api/coupons/admin/assign`,
                { user_ids: selectedUsers, coupon_id: assignModal.couponId },
                { withCredentials: true }
            );
            toastSuccess(`Assigned to ${selectedUsers.length} users successfully!`);
            setAssignModal({ show: false, couponId: null });
        } catch (err) {
            toastError(axiosErrorMessage(err, "Assignment failed"));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
                <h3 className="text-lg font-bold mb-2">Assign "{assignModal.couponCode}"</h3>
                <p className="text-sm text-gray-500 mb-4">Select users to grant them this exclusive coupon.</p>

                <UserSelector users={users} selectedUsers={selectedUsers} onChange={setSelectedUsers} />

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setAssignModal({ show: false, couponId: null })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button onClick={handleAssign} className="px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700">
                        Assign ({selectedUsers.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const CouponManager = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [users, setUsers] = useState([]);
    const [assignModal, setAssignModal] = useState({ show: false, couponId: null, couponCode: '' });
    const [editData, setEditData] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Lifetime';
        return new Date(dateStr).toLocaleDateString();
    };

    const fetchCoupons = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/coupons/admin`, { withCredentials: true });
            setCoupons(res.data);
            setLoading(false);
        } catch (err) {
            toastError("Failed to fetch coupons");
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/users?limit=1000`, { withCredentials: true });
            if (res.data && res.data.users) {
                setUsers(res.data.users);
            } else if (Array.isArray(res.data)) {
                setUsers(res.data);
            }
        } catch (err) {
            console.error("Failed to load users for assignment");
        }
    }, []);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/coupons/admin/${id}`, { withCredentials: true });
            toastSuccess("Coupon deleted");
            fetchCoupons();
        } catch (err) {
            toastError("Failed to delete coupon");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/coupons/admin/${id}/toggle`, {}, { withCredentials: true });
            toastSuccess("Status updated");
            fetchCoupons();
        } catch (err) {
            toastError("Failed to update status");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="text-pink-600" /> Coupon Manager</h1>
                    <p className="text-gray-500 text-sm">Create and assign discount codes</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700">
                    <Plus size={20} /> Create New
                </button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-4">Code</th>
                                <th className="p-4">Discount</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Validity</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {coupons.map(coupon => (
                                <tr key={coupon.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono font-bold text-blue-600">{coupon.code}</td>
                                    <td className="p-4">
                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">
                                            {coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}% OFF`}
                                        </span>
                                    </td>
                                    <td className="p-4 max-w-xs text-gray-600 truncate">{coupon.description || '-'}</td>
                                    <td className="p-4 text-gray-500 flex flex-col gap-1">
                                        <div className="flex items-center gap-1"><Calendar size={14} /> {formatDate(coupon.valid_until)}</div>
                                        {coupon.is_public && <div className="flex items-center gap-1 text-xs text-purple-600 font-bold bg-purple-50 w-fit px-1 rounded"><Users size={12} /> Public</div>}
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleToggle(coupon.id)} className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${coupon.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {coupon.is_active ? <CheckCircle size={14} /> : <StopCircle size={14} />}
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="p-4 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setAssignModal({ show: true, couponId: coupon.id, couponCode: coupon.code })}
                                            className="text-purple-600 hover:bg-purple-50 p-2 rounded" title="Assign to User">
                                            <UserPlus size={18} />
                                        </button>
                                        <button
                                            onClick={() => setEditData(coupon)}
                                            className="text-blue-500 hover:bg-blue-50 p-2 rounded" title="Edit Coupon">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(coupon.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {coupons.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">No coupons found. Create one to get started!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {(showForm || editData) && (
                <CouponForm
                    initialData={editData}
                    onClose={() => { setShowForm(false); setEditData(null); }}
                    onRefresh={fetchCoupons}
                    users={users}
                    fetchUsers={fetchUsers}
                />
            )}
            {assignModal.show && (
                <AssignModal
                    assignModal={assignModal}
                    setAssignModal={setAssignModal}
                    users={users}
                    fetchUsers={fetchUsers}
                />
            )}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Coupon?"
                message="Are you sure you want to delete this coupon? This action cannot be undone."
                confirmText="Delete Coupon"
                isDelete={true}
            />
        </div>
    );
};

export default CouponManager;
