import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function PromoSection() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPromos = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/promos`);
                // Only show active ones AND those with all required fields filled
                const validPromos = res.data.filter(p =>
                    p.status === 'active' &&
                    p.title && p.title.trim() !== "" &&
                    p.subtitle && p.subtitle.trim() !== "" &&
                    p.offer_text && p.offer_text.trim() !== "" &&
                    p.link_url && p.link_url.trim() !== "" &&
                    p.image_url && p.image_url.trim() !== ""
                );
                setPromos(validPromos);
            } catch (err) {
                console.error("Failed to fetch promos", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPromos();
    }, []);

    if (loading || promos.length === 0) return null;

    return (
        <div className="mx-auto px-2 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promos.map((promo) => (
                    <Link
                        key={promo.id}
                        to={promo.link_url}
                        className="group relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all duration-300 block bg-[#00bcd4]"
                        style={{ minHeight: '220px' }}
                    >
                        {/* Background Image Container */}
                        <div className="absolute inset-0 w-full h-full">
                            <img
                                src={`${API_BASE_URL}${promo.image_url}`}
                                alt={promo.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>

                        {/* Overlay Gradient (Optional, if text is on image) */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>

                        {/* Content Container */}
                        <div className="relative z-10 p-6 h-full flex flex-col justify-center max-w-[60%]">
                            <p className="text-white/90 text-sm font-medium mb-1 drop-shadow-sm">
                                {promo.subtitle}
                            </p>
                            <h3 className="text-white text-2xl font-bold mb-2 leading-tight drop-shadow-md">
                                {promo.title}
                            </h3>
                            <div className="mt-2 inline-block">
                                <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded text-lg font-bold border border-white/30">
                                    {promo.offer_text}
                                </span>
                            </div>
                        </div>

                        {/* Decorative Element */}
                        <div className="absolute bottom-4 right-4 text-white/20">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
