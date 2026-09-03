import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toastError } from '../../utils/toast';
import { Star } from 'lucide-react';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const ProductReviewsPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch product details first (using slug as primary route param)
                const productRes = await axios.get(`${API_BASE_URL}/products?slug=${slug}`);
                const products = productRes.data.products || productRes.data;
                const foundProduct = Array.isArray(products) ? products[0] : products;

                if (!foundProduct) {
                    toastError("Product not found");
                    navigate('/');
                    return;
                }
                setProduct(foundProduct);

                // Fetch reviews
                const reviewsRes = await axios.get(`${API_BASE_URL}/reviews/product/${foundProduct.id}`);
                setReviews(reviewsRes.data.reviews || []);

            } catch (err) {
                console.error("Error fetching data:", err);
                toastError("Failed to load reviews");
            } finally {
                setLoading(false);
            }
        };

        if (slug) fetchData();
    }, [slug, navigate]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!product) return null;

    const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: reviews.filter(r => Math.round(r.rating) === stars).length,
        percent: reviews.length ? (reviews.filter(r => Math.round(r.rating) === stars).length / reviews.length) * 100 : 0
    }));

    return (
        <div className="bg-[#f1f3f6] min-h-screen pb-10">
            <div className="bg-white shadow">
                <div className="max-w-[1248px] mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                    <Link to="/" className="hover:text-blue-600">Home</Link>
                    <span>›</span>
                    <Link to={`/product/${slug}/`} className="hover:text-blue-600 truncate max-w-[200px]">{product.name}</Link>
                    <span>›</span>
                    <span className="text-gray-800 font-medium">Product Reviews</span>
                </div>
            </div>

            <div className="max-w-[1248px] mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 mt-4 px-2 lg:px-0">
                {/* Left Column: Ratings Summary */}
                <div className="bg-white shadow-sm p-6 h-fit sticky top-20">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {product.avg_rating ? Number(product.avg_rating).toFixed(1) : 0} <Star className="w-6 h-6 fill-current text-white bg-green-600 p-1 rounded-sm" />
                        </h1>
                        <p className="text-gray-500 text-sm">{product.rating_count} Ratings & {product.review_count} Reviews</p>
                    </div>

                    <div className="space-y-3 mb-6">
                        {ratingDistribution.map(({ stars, count, percent }) => (
                            <div key={stars} className="flex items-center gap-3 text-sm">
                                <span className="font-medium">{stars} ★</span>
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                                <span className="text-gray-400 text-xs w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Reviews List */}
                <div className="bg-white shadow-sm">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-medium text-gray-800">Reviews for {product.name}</h2>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {reviews.length > 0 ? (
                            reviews.map(review => (
                                <div key={review.id} className="p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 ${review.rating >= 4 ? "bg-green-600" :
                                            review.rating >= 3 ? "bg-green-500" :
                                                review.rating >= 2 ? "bg-orange-400" : "bg-red-500"
                                            }`}>
                                            {review.rating} ★
                                        </span>
                                        <span className="font-bold text-sm text-gray-800">{review.comment.substring(0, 50)}...</span>
                                    </div>

                                    <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{review.comment}</p>

                                    {/* Review Images */}
                                    {review.images && (
                                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                            {JSON.parse(review.images).map((img, idx) => (
                                                <div key={idx} className="w-16 h-16 border rounded-sm overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90">
                                                    <img src={`${API_BASE_URL}${img}`} alt="Review" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="font-medium text-gray-600">{review.user_name}</span>
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                        {/* Purchase Verification Badge (Mock as we verify on backend now) */}
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Certified Buyer
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center">
                                <p className="text-gray-500">No reviews yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductReviewsPage;
