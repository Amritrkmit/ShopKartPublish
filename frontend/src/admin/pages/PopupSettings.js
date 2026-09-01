import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toastSuccess, toastError } from '../../utils/toast';
import { Gift, Save, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PopupSettings = () => {
    const [popup, setPopup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        type: 'text',
        trigger_type: 'time_delay',
        trigger_value: 5,
        is_active: false,
        content: {}
    });

    // Content specific fields
    const [textBody, setTextBody] = useState('');
    const [btnText, setBtnText] = useState('');
    const [segments, setSegments] = useState('');
    const [couponCode, setCouponCode] = useState('');

    useEffect(() => {
        fetchPopups();
    }, []);

    const fetchPopups = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/popups/admin`, { withCredentials: true });
            // For MVP, we assume 1 active or 1st available popup is what we edit.
            // Complex version would list multiple.
            const target = res.data[0];

            if (target) {
                setPopup(target);
                let parsedContent = {};
                try {
                    parsedContent = typeof target.content === 'string' ? JSON.parse(target.content) : target.content;
                } catch (e) { }

                setFormData({
                    title: target.title,
                    type: target.type,
                    trigger_type: target.trigger_type,
                    trigger_value: target.trigger_value,
                    is_active: target.is_active,
                    content: parsedContent
                });

                // Hydrate easy fields
                setTextBody(parsedContent.text || '');
                setBtnText(parsedContent.cta || 'Got it!');
                setCouponCode(parsedContent.coupon || '');
                setSegments(parsedContent.segments ? parsedContent.segments.join(', ') : '');
            } else {
                setPopup(null); // Should handle "Create New" logically, but migration seeded one.
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            toastError("Failed to fetch settings");
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Construct JSON content based on type
        let newContent = {};
        if (formData.type === 'spinner') {
            newContent = {
                text: textBody,
                coupon: couponCode,
                segments: segments.split(',').map(s => s.trim()).filter(s => s)
            };
        } else {
            newContent = {
                text: textBody,
                cta: btnText,
                image: formData.content.image // persist existing image if any
            };
        }

        const payload = { ...formData, content: newContent };

        try {
            if (popup) {
                await axios.put(`${API_BASE_URL}/api/popups/admin/${popup.id}`, payload, { withCredentials: true });
                toastSuccess("Popup updated successfully!");
                fetchPopups(); // Refresh
            }
        } catch (err) {
            toastError("Failed to save popup");
        }
    };

    if (loading) return <div className="p-10">Loading settings...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Gift className="text-purple-600" /> Marketing Popups
            </h1>

            <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
                <form onSubmit={handleSave} className="space-y-6">

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                        <div>
                            <h3 className="font-bold text-gray-700">Popup Status</h3>
                            <p className="text-sm text-gray-500">Enable or disable the popup on the live site.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors
                                ${formData.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                        >
                            {formData.is_active ? <><Eye size={18} /> Active</> : <><EyeOff size={18} /> Inactive</>}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Settings */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Internal Title</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border rounded-md p-2"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Popup Type</label>
                                <select
                                    className="mt-1 block w-full border rounded-md p-2 bg-white"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="text">Standard (Text/Image)</option>
                                    <option value="spinner">Spin-to-Win Wheel</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Trigger Conditions</label>
                                <div className="flex gap-2">
                                    <select
                                        className="mt-1 block w-full border rounded-md p-2 bg-white"
                                        value={formData.trigger_type}
                                        onChange={e => setFormData({ ...formData, trigger_type: e.target.value })}
                                    >
                                        <option value="time_delay">Time Delay (Seconds)</option>
                                        <option value="first_visit">First Visit Only</option>
                                    </select>
                                    <input
                                        type="number"
                                        className="mt-1 block w-24 border rounded-md p-2"
                                        value={formData.trigger_value}
                                        onChange={e => setFormData({ ...formData, trigger_value: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Content Settings */}
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-bold text-gray-700 border-b pb-2">Content Configuration</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Body Text / Headline</label>
                                <textarea
                                    className="mt-1 block w-full border rounded-md p-2"
                                    rows="2"
                                    value={textBody}
                                    onChange={e => setTextBody(e.target.value)}
                                    placeholder="e.g. Sign up today and get 10% off!"
                                ></textarea>
                            </div>

                            {formData.type === 'spinner' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Wheel Segments (Comma Separated)</label>
                                        <textarea
                                            className="mt-1 block w-full border rounded-md p-2 font-mono text-sm"
                                            rows="3"
                                            value={segments}
                                            onChange={e => setSegments(e.target.value)}
                                            placeholder="10% OFF, Try Again, Free Ship..."
                                        ></textarea>
                                        <p className="text-xs text-gray-500 mt-1">Segments alternate colors automatically.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Winning Coupon Code</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border rounded-md p-2 font-bold text-green-700"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value)}
                                            placeholder="WELCOME10"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Button Text</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border rounded-md p-2"
                                        value={btnText}
                                        onChange={e => setBtnText(e.target.value)}
                                        placeholder="Got it!"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Save size={20} /> Save Changes
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default PopupSettings;
