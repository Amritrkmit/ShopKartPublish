import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toastError, toastSuccess } from '../../utils/toast';
import { generateProductUrl } from '../../utils/productUrl';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const WriteReviewPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    // Verification State
    const [loading, setLoading] = useState(true);
    const [canReview, setCanReview] = useState(false);
    const [product, setProduct] = useState(null);

    // Form State
    const [newReview, setNewReview] = useState({
        rating: 0,
        comment: "",
        delivery_rating: 5,
        packaging_rating: 5,
        images: []
    });
    const [existingReviewId, setExistingReviewId] = useState(null);

    useEffect(() => {
        const checkEligibility = async () => {
            try {
                const token = localStorage.getItem("userToken");
                if (!token) {
                    toastError("Please login to write a review");
                    navigate('/login/');
                    return;
                }

                // 1. Fetch Product by Slug
                const slugRes = await axios.get(`${API_BASE_URL}/products?slug=${slug}`);
                const products = slugRes.data.products || slugRes.data;
                const foundProduct = Array.isArray(products) ? products[0] : products;

                if (!foundProduct) {
                    toastError("Product not found");
                    navigate('/');
                    return;
                }
                setProduct(foundProduct);

                console.log("Checking eligibility for Product:", foundProduct.id, foundProduct.slug);
                const checkRes = await axios.get(`${API_BASE_URL}/reviews/can-review/${foundProduct.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                console.log("Eligibility Response:", checkRes.data);

                if (checkRes.data.canReview) {
                    setCanReview(true);
                    if (checkRes.data.existingReview) {
                        const er = checkRes.data.existingReview;
                        setExistingReviewId(er.id);
                        setNewReview({
                            rating: er.rating,
                            comment: er.comment || "",
                            delivery_rating: er.delivery_rating || 5,
                            packaging_rating: er.packaging_rating || 5,
                            images: [] // New images to upload, we don't fetch old files into this array
                        });
                    }
                } else {
                    setCanReview(false);
                }

            } catch (err) {
                console.error("Eligibility Check Error:", err);
                // If 403 or specific blocked
                setCanReview(false);
            } finally {
                setLoading(false);
            }
        };

        checkEligibility();
    }, [slug, navigate]);

    const handleSubmitReview = async () => {
        if (newReview.rating === 0) {
            toastError("Please select a star rating");
            return;
        }
        if (newReview.images.length > 5) {
            toastError("Max 5 images allowed");
            return;
        }

        try {
            const token = localStorage.getItem("userToken");

            if (existingReviewId) {
                // Update Existing Review
                const updateData = {
                    rating: newReview.rating,
                    comment: newReview.comment,
                    delivery_rating: newReview.delivery_rating,
                    packaging_rating: newReview.packaging_rating
                };
                await axios.put(`${API_BASE_URL}/reviews/${existingReviewId}`, updateData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // Submit New Review
                const formData = new FormData();
                formData.append('product_id', product.id);
                formData.append('rating', newReview.rating);
                formData.append('comment', newReview.comment);
                formData.append('delivery_rating', newReview.delivery_rating);
                formData.append('packaging_rating', newReview.packaging_rating);
                newReview.images.forEach(file => formData.append('images', file));

                await axios.post(`${API_BASE_URL}/reviews`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            toastSuccess(existingReviewId ? "Review updated successfully!" : "Review submitted successfully!");
            // Use url_token if available for cleaner Flipkart-style URL, else fallback to id
            console.log("Redirecting to product page with ID:", product?.id);
            navigate(generateProductUrl(product)); // Go back to product page

        } catch (err) {
            console.error("Submit Error:", err);
            toastError(err.response?.data?.message || "Failed to submit review");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Checking eligibility...</div>;

    // ---------------- NOT PURCHASED STATE ----------------
    if (!canReview) {
        return (
            <div className="min-h-screen bg-[#f1f3f6]">
                {/* White Header Section */}
                <div className="bg-white border-b">
                    <div className="mx-auto px-3 lg:px-8 py-3 flex items-center justify-between p-2">
                        <h1 className="text-xl font-bold text-gray-800">Ratings & Reviews</h1>
                        {product && (
                            <Link to={generateProductUrl(product)} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                                <span className="text-sm font-medium text-gray-800 hidden md:block max-w-[300px] truncate">
                                    {product.name}
                                </span>
                                <img
                                    src={`${API_BASE_URL}${product.image}`}
                                    alt={product.name}
                                    className="w-10 h-10 object-contain border rounded-sm p-0.5"
                                />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mx-auto py-10 px-2 p-2">
                    <div className="bg-white shadow-sm border rounded-sm overflow-hidden flex flex-col md:flex-row" style={{ minHeight: '400px' }}>
                        {/* Left Sidebar (Guidelines) */}
                        <div className="hidden md:block w-1/4 border-r p-8 bg-gray-50">
                            <h3 className="font-bold text-gray-800 mb-6 uppercase tracking-wider text-sm">What makes a good review</h3>
                            <div className="space-y-6 text-xs text-gray-600">
                                <div>
                                    <p className="font-bold text-gray-800 mb-2">Have you used this product?</p>
                                    <p className="leading-relaxed">Your review should be about your experience with the product.</p>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 mb-2">Why review a product?</p>
                                    <p className="leading-relaxed">Your valuable feedback will help fellow shoppers decide!</p>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Not Purchased Message */}
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                            <div className="mb-8">
                                <img
                                    src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/error-500_f9bbb4.png"
                                    alt="Not Purchased"
                                    className="w-56 h-auto opacity-90"
                                />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Haven't purchased this product?</h2>
                            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                                Sorry! You are only allowed to review products that you have purchased on our platform.
                            </p>
                            <button
                                onClick={() => navigate(generateProductUrl(product))}
                                className="mt-8 px-8 py-2.5 bg-[#2874f0] text-white font-bold text-sm rounded-sm shadow-md hover:bg-[#1259d3] transition-colors"
                            >
                                BACK TO PRODUCT
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ---------------- WRITE REVIEW FORM ----------------
    return (
        <div className="min-h-screen bg-[#f1f3f6]">
            {/* White Header Section */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">Ratings & Reviews</h1>
                    {product && (
                        <Link to={generateProductUrl(product)} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                            <span className="text-sm font-medium text-gray-800 hidden md:block max-w-[300px] truncate">
                                {product.name}
                            </span>
                            <img
                                src={`${API_BASE_URL}${product.image}`}
                                alt={product.name}
                                className="w-10 h-10 object-contain border rounded-sm p-0.5"
                            />
                        </Link>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Sidebar (Guidelines) */}
                    <div className="hidden md:block w-72 flex-shrink-0">
                        <div className="bg-white shadow-sm rounded-sm p-5 sticky top-20">
                            <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">What makes a good review</h3>
                            <div className="space-y-6 text-xs text-gray-600 border-t pt-5">
                                <div>
                                    <p className="font-bold text-gray-800 mb-2">Have you used this product?</p>
                                    <p className="leading-relaxed">Your review should be about your experience with the product.</p>
                                </div>
                                <div className="border-t pt-5">
                                    <p className="font-bold text-gray-800 mb-2">Why review a product?</p>
                                    <p className="leading-relaxed">Your valuable feedback will help fellow shoppers decide!</p>
                                </div>
                                <div className="border-t pt-5">
                                    <p className="font-bold text-gray-800 mb-2">How to review a product?</p>
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li>Your review should be authentic and based on your own experience.</li>
                                        <li>Avoid using casual language or slang.</li>
                                        <li>Keep your review focused and detail-oriented.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Review Form */}
                    <div className="flex-1">
                        <div className="bg-white shadow-sm rounded-sm p-6 lg:p-10">
                            <h2 className="text-lg font-bold text-gray-800 mb-8 pb-4 border-b">Rate this product</h2>

                            {/* Stars */}
                            <div className="flex gap-4 mb-10 items-center">
                                <span className="text-sm font-semibold text-gray-500 w-24">Select Rating</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setNewReview({ ...newReview, rating: star })}
                                            className={`text-4xl transition-all duration-200 transform hover:scale-125 ${newReview.rating >= star ? "text-[#388e3c]" : "text-gray-200"}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                {newReview.rating > 0 && (
                                    <span className={`ml-4 text-sm font-bold ${newReview.rating >= 4 ? "text-green-600" :
                                        newReview.rating >= 3 ? "text-orange-500" : "text-red-500"
                                        }`}>
                                        {["Very Poor", "Poor", "Good", "Very Good", "Excellent"][newReview.rating - 1]}
                                    </span>
                                )}
                            </div>

                            {/* Review Text */}
                            <div className="mb-10">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Review this product</label>
                                <textarea
                                    rows="6"
                                    placeholder="Description..."
                                    className="w-full border-2 border-gray-100 rounded-sm p-4 text-sm focus:border-brand-orange outline-none resize-none transition-colors"
                                    value={newReview.comment}
                                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-[11px] text-gray-400">Min 30 characters for better visibility</p>
                                    <p className="text-[11px] text-gray-400">{newReview.comment.length} characters</p>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="mb-10 p-6 bg-gray-50 rounded-sm border border-dashed border-gray-300">
                                <label className="block text-sm font-bold text-gray-700 mb-4">Add Photos/Videos</label>
                                <div className="flex flex-wrap gap-4">
                                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-brand-orange transition-colors group">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => setNewReview({ ...newReview, images: [...newReview.images, ...Array.from(e.target.files)] })}
                                            className="hidden"
                                        />
                                        <span className="text-2xl text-gray-400 group-hover:text-brand-orange">+</span>
                                        <span className="text-[10px] text-gray-400 font-bold group-hover:text-brand-orange">ADD</span>
                                    </label>
                                    {newReview.images.map((file, i) => (
                                        <div key={i} className="relative w-24 h-24 group">
                                            <div className="w-full h-full border rounded-sm overflow-hidden bg-white">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const updated = [...newReview.images];
                                                    updated.splice(i, 1);
                                                    setNewReview({ ...newReview, images: updated });
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Max 5 images allowed. JPG, PNG accepted.</p>
                            </div>

                            {/* Aspect Ratings */}
                            <div className="mb-10">
                                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Product Features</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase mb-4 tracking-tighter">Delivery Speed</p>
                                        <div className="flex gap-3">
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => setNewReview({ ...newReview, delivery_rating: v })}
                                                    className={`w-10 h-10 rounded-full border-2 text-xs font-bold flex items-center justify-center transition-all ${newReview.delivery_rating === v ? "bg-brand-orange border-brand-orange text-white shadow-md scale-110" : "border-gray-100 text-gray-400 hover:border-gray-300"}`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase mb-4 tracking-tighter">Packaging Quality</p>
                                        <div className="flex gap-3">
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => setNewReview({ ...newReview, packaging_rating: v })}
                                                    className={`w-10 h-10 rounded-full border-2 text-xs font-bold flex items-center justify-center transition-all ${newReview.packaging_rating === v ? "bg-brand-orange border-brand-orange text-white shadow-md scale-110" : "border-gray-100 text-gray-400 hover:border-gray-300"}`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t mt-10">
                                <button
                                    onClick={handleSubmitReview}
                                    className="w-full sm:w-[280px] bg-[#fb641b] text-white font-bold py-4 text-xs uppercase rounded-[2px] shadow-lg hover:bg-[#eb5d14] transition-all hover:shadow-xl active:scale-[0.98]"
                                >
                                    Submit Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WriteReviewPage;
