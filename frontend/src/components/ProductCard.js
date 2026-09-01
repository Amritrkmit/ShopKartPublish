import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useCart from "../hooks/useCart";
import useWishlist from "../hooks/useWishlist";
import { parsePrice } from "../utils/format";
import { generateHomepageProductUrl } from "../utils/productUrl";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProductCard = ({ product, section, addToWishlist: propAddToWishlist, removeFromWishlist: propRemoveFromWishlist, wishlist: propWishlist }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();

    // Use context if props are not provided
    const { wishlist: contextWishlist, addToWishlist: contextAddToWishlist, removeFromWishlist: contextRemoveFromWishlist } = useWishlist();

    const wishlist = propWishlist || contextWishlist;
    const addToWishlist = propAddToWishlist || contextAddToWishlist;
    const removeFromWishlist = propRemoveFromWishlist || contextRemoveFromWishlist;

    const isWishlisted = Array.isArray(wishlist) && wishlist.includes(product.id);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Prepare images array: [mainImage, ...galleryImages]
    // Prepare images array: [mainImage, ...galleryImages]
    let galleryImages = [];
    if (product.images) {
        if (Array.isArray(product.images)) {
            galleryImages = product.images;
        } else if (typeof product.images === 'string') {
            try {
                // Try parsing as JSON first (if backend ever reverts or returns json string)
                if (product.images.startsWith('[')) {
                    galleryImages = JSON.parse(product.images);
                } else {
                    // Otherwise assume comma-separated (GROUP_CONCAT)
                    galleryImages = product.images.split(',');
                }
            } catch (e) {
                console.error("Failed to parse product images", e);
                galleryImages = product.images.split(',');
            }
        }
    }
    const validGalleryImages = Array.isArray(galleryImages) ? galleryImages.filter(img => img) : [];

    const allImages = [product.image, ...validGalleryImages].filter(Boolean);
    const uniqueImages = [...new Set(allImages)].map(img => img.startsWith('http') ? img : `${API_BASE_URL}${img}`).slice(0, 5);

    useEffect(() => {
        let interval;
        if (isHovered && uniqueImages.length > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % uniqueImages.length);
            }, 1500); // 1.5s delay for slide
        } else {
            setCurrentImageIndex(0);
        }
        return () => clearInterval(interval);
    }, [isHovered, uniqueImages.length]);

    return (
        <div
            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-3 flex flex-col h-full border border-transparent hover:border-gray-100 group relative overflow-hidden"
            onClick={() => {
                // Generate clean URL with UTM tracking
                const url = generateHomepageProductUrl(product, section || 'featured');
                navigate(url);
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Wishlist Button (absolute top right) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    isWishlisted ? removeFromWishlist(product.id) : addToWishlist(product.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm shadow-sm rounded-full z-10 hover:scale-110 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 md:h-5 md:w-5 ${isWishlisted ? "text-brand-orange fill-current" : "text-gray-300"}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Compare Toggle (absolute top left) */}
            {/* <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <label className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 cursor-pointer hover:bg-white transition-all">
                    <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(product.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Compare</span>
                </label>
            </div> */}

            {/* Image Container (fixed ratio) */}
            <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center">
                {uniqueImages.length > 0 ? (
                    <img
                        src={uniqueImages[currentImageIndex]}
                        alt={product.name}
                        className="w-[85%] h-[85%] object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic">
                        No Image
                    </div>
                )}

                {/* Slider Indicators (only on hover) */}
                {isHovered && uniqueImages.length > 1 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-2">
                        {uniqueImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-4 bg-brand-orange' : 'w-1.5 bg-gray-300'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Product Info (Left Aligned) */}
            <div className="flex flex-col flex-grow text-left">
                {/* Brand */}
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">
                    {product.brand || "E-Store"}
                </p>

                {/* Title (fixed 2 lines) */}
                <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px] leading-tight mb-2 group-hover:text-brand-orange transition-colors">
                    {product.name}
                </h3>

                {/* Shop Badge */}
                {(product.shop_name || product.shop_logo) && (
                    <div className="flex items-center gap-2 mb-2 p-1.5 bg-gray-50 rounded-lg group/shop cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        if (product.shop_slug) navigate(`/shop/${product.shop_slug}/`);
                    }}>
                        {product.shop_logo ? (
                            <img
                                src={`${API_BASE_URL}${product.shop_logo}`}
                                alt={product.shop_name}
                                className="w-5 h-5 rounded-full object-cover border border-gray-200"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 border border-orange-200">
                                {product.shop_name?.charAt(0) || 'S'}
                            </div>
                        )}
                        <span className="text-[11px] font-medium text-gray-600 truncate flex-1 group-hover/shop:text-brand-orange transition-colors">
                            {product.shop_name || "Official Store"}
                        </span>
                        {product.distance != null && (
                            <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                                {Number(product.distance).toFixed(1)}km
                            </span>
                        )}
                    </div>
                )}

                {/* Categories */}
                {product.subcategory_name && (
                    <p className="text-[11px] text-gray-400 mb-1 truncate uppercase tracking-tight font-medium">
                        {product.subcategory_name}
                    </p>
                )}

                {/* Price Section */}
                <div className="flex flex-col gap-0.5 mt-2 mb-1">
                    {(() => {
                        const mrp = parsePrice(product.price);
                        const selling = parsePrice(product.sale_price) || mrp;
                        const hasDiscount = mrp > selling;

                        return (
                            <>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-base font-bold text-gray-900">₹{selling.toLocaleString("en-IN")}</span>
                                    {hasDiscount && (
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="text-[11px] text-gray-400 line-through decoration-red-400">₹{mrp.toLocaleString("en-IN")}</span>
                                            <span className="text-[11px] text-green-600 font-bold whitespace-nowrap">
                                                {Math.round(((mrp - selling) / mrp) * 100)}% off
                                            </span>
                                        </div>
                                    )}
                                    {Boolean(product.is_assured) && (
                                        <img
                                            src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_627d6a.png"
                                            alt="Assured"
                                            className="h-3.5 object-contain ml-auto"
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* Add to Cart Button (Animated) */}
            <div className="mt-3 overflow-hidden rounded-lg">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                    }}
                    className="w-full py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-orange transition-all duration-300 flex items-center justify-center gap-2 transform translate-y-full group-hover:translate-y-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Add to Cart
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
