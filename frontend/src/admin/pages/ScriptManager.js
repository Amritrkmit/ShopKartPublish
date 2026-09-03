import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toastSuccess, toastError } from '../../utils/toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const ScriptManager = () => {
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScript, setEditingScript] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null });

    // Client-side Search & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'HEAD',
        category: 'analytics',
        content: '',
        is_enabled: true
    });

    useEffect(() => {
        fetchScripts();
    }, []);

    const fetchScripts = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/scripts/admin`, { withCredentials: true });
            setScripts(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            toastError("Failed to fetch scripts");
            setLoading(false);
        }
    };

    const handleOpenModal = (script = null) => {
        if (script) {
            setEditingScript(script);
            setFormData({
                name: script.name,
                type: script.type,
                category: script.category,
                content: script.content,
                is_enabled: script.is_enabled
            });
        } else {
            setEditingScript(null);
            setFormData({
                name: '',
                type: 'HEAD',
                category: 'analytics',
                content: '',
                is_enabled: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingScript) {
                await axios.put(`${API_BASE_URL}/api/scripts/admin/${editingScript.id}`, formData, { withCredentials: true });
                toastSuccess("Script updated successfully");
            } else {
                await axios.post(`${API_BASE_URL}/api/scripts/admin`, formData, { withCredentials: true });
                toastSuccess("Script added successfully");
            }
            setIsModalOpen(false);
            fetchScripts();
        } catch (err) {
            toastError("Failed to save script");
        }
    };

    const handleDelete = (id) => {
        setDeleteModal({ show: true, id });
    };

    const confirmDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/scripts/admin/${id}`, { withCredentials: true });
            toastSuccess("Script deleted");
            fetchScripts();
        } catch (err) {
            toastError("Failed to delete script");
        } finally {
            setDeleteModal({ show: false, id: null });
        }
    };

    const toggleStatus = async (script) => {
        try {
            await axios.put(`${API_BASE_URL}/api/scripts/admin/${script.id}`, {
                ...script,
                is_enabled: !script.is_enabled
            }, { withCredentials: true });
            toastSuccess(`Script ${script.is_enabled ? 'disabled' : 'enabled'}`);
            fetchScripts();
        } catch (err) {
            toastError("Failed to update status");
        }
    };

    // Client-side Filtering & Pagination Logic
    const filteredScripts = scripts.filter(script =>
        script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        script.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        script.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredScripts.length / itemsPerPage);
    const paginatedScripts = filteredScripts.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    // Reset page on search
    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Tracking Scripts Manager</h1>

                <div className="flex gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Search scripts..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                        <Plus size={20} /> Add Script
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-full">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading scripts...</div>
                ) : filteredScripts.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No scripts found.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedScripts.map((script) => (
                                        <tr key={script.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{script.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{script.type}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-1 rounded text-xs capitalize
                                                    ${script.category === 'essential' ? 'bg-blue-100 text-blue-800' :
                                                        script.category === 'analytics' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {script.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button onClick={() => toggleStatus(script)} className="focus:outline-none">
                                                    {script.is_enabled ? (
                                                        <ToggleRight size={24} className="text-green-500" />
                                                    ) : (
                                                        <ToggleLeft size={24} className="text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                                                <button onClick={() => handleOpenModal(script)} className="text-blue-600 hover:text-blue-900"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(script.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={`flex items-center gap-1 px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className={`flex items-center gap-1 px-3 py-1 rounded border ${page >= totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{editingScript ? 'Edit Script' : 'Add New Script'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Script Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border rounded-md p-2"
                                    placeholder="e.g. Google Analytics 4"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Placement Type</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md p-2 bg-white"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="HEAD">HEAD (Recommended for GA/Pixel)</option>
                                        <option value="BODY_START">Body Start</option>
                                        <option value="BODY_END">Body End</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Consent Category</label>
                                    <select
                                        className="mt-1 block w-full border rounded-md p-2 bg-white"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="analytics">Analytics</option>
                                        <option value="marketing">Marketing (Pixel/Ads)</option>
                                        <option value="essential">Essential (Always Load)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Script Content</label>
                                <p className="text-xs text-gray-500 mb-2">Paste the full code, including &lt;script&gt; tags.</p>
                                <textarea
                                    required
                                    className="block w-full border rounded-md p-2 font-mono text-sm bg-gray-50"
                                    rows="8"
                                    placeholder="<script>...</script>"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {editingScript ? 'Update Script' : 'Add Script'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Script?"
                message="Are you sure you want to delete this script? This action cannot be undone."
                confirmText="Delete Script"
                isDelete={true}
            />
        </div>
    );
};

export default ScriptManager;
