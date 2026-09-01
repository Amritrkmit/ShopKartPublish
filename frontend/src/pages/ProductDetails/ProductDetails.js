import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import useCart from "../../hooks/useCart";
import { toastSuccess, toastError } from "../../utils/toast";
import SEO from "../../components/SEO";
import useWishlist from "../../hooks/useWishlist";
import useRecentlyViewed from "../../hooks/useRecentlyViewed";
import ProductRow from "../../components/ProductRow";
import PriceTracker from "../../components/Trust/PriceTracker";
import SellerVibe from "../../components/Trust/SellerVibe";
import { Plus, Info, ChevronRight, Share2, TrendingUp, ShieldCheck, X, Zap } from "lucide-react";
import { useCompare } from "../../context/CompareContext";
import GroupBuyWidget from "../../components/GroupBuy/GroupBuyWidget";
import { generateProductUrl, generateWriteReviewUrl, generateProductReviewsUrl } from "../../utils/productUrl";
import { decryptId } from "../../utils/secureId";

import { formatPrice } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import DeliveryLocationModal from "../../components/DeliveryLocation/DeliveryLocationModal";
import DeliveryMapSelector from "../../components/DeliveryLocation/DeliveryMapSelector";
import { useDeliveryLocation } from "../../context/DeliveryLocationContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const CategoryPage = React.lazy(() => import('../CategoryPage/CategoryPage'));

// Helper to handle resolving collisions between Product and Category slugs
const NotFoundHandler = ({ slug }) => {
    // Only attempt to render CategoryPage if the slug "looks" like a category (optional heuristic)
    // Or just try rendering it. CategoryPage handles invalid categories gracefully (hopefully showing empty or 404).
    // IMPORTANT: CategoryPage reads useParams(). We need to patch that context if possible, 
    // OR modify CategoryPage to accept props.
    // For now, let's pass a prop `overrideSlug` to CategoryPage.

    return <CategoryPage overrideSlug={slug} />;
};

const ProductDetails = () => {
    const { slug } = useParams(); // Only slug from route
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const { compareList, toggleCompare } = useCompare();

    const { addToCart, addMultipleToCart } = useCart();
    const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
    const { recentlyViewedIds, addRecentlyViewed } = useRecentlyViewed();
    const { user } = useAuth();
    const { setLocation, selectedLocation } = useDeliveryLocation();

    const [similarProducts, setSimilarProducts] = useState([]);
    const [interestedProducts, setInterestedProducts] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);

    // Delivery Location State
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showMapSelector, setShowMapSelector] = useState(false);

    // Delivery Check State
    const [pincode, setPincode] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(null);
    const [pincodeError, setPincodeError] = useState(null);
    const [checkLoading, setCheckLoading] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);
    const wrapperRef = React.useRef(null);

    // Reviews State
    const [reviews, setReviews] = useState([]);
    const [myReview, setMyReview] = useState(null);

    const [gallery, setGallery] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [variants, setVariants] = useState([]);
    const [quantity, setQuantity] = useState(1);

    // AI Summary State
    const [aiSummary, setAiSummary] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [foundTreasure, setFoundTreasure] = useState(null);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [showVibeModal, setShowVibeModal] = useState(false);
    const [hasVibeScore, setHasVibeScore] = useState(false);
    const [hasPriceHistory, setHasPriceHistory] = useState(false);
    const [groupDeal, setGroupDeal] = useState(null);
    const [showGroupDealModal, setShowGroupDealModal] = useState(false);
    const [bundleProducts, setBundleProducts] = useState([]);
    const [selectedBundleIds, setSelectedBundleIds] = useState([]);

    // Pagination for reviews
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);
    const [showAllOffers, setShowAllOffers] = useState(false);
    const [showAllSpecs, setShowAllSpecs] = useState(false);
    const [showTCModal, setShowTCModal] = useState(false);
    const [activeTCContent, setActiveTCContent] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activePaymentTab, setActivePaymentTab] = useState("");
    const [activeInstitution, setActiveInstitution] = useState("");

    const [customization, setCustomization] = useState({});
    const [uploadingImage, setUploadingImage] = useState(false);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowAddressDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);


    useEffect(() => {
        if (user) {
            axios.get(`${API_BASE_URL}/users/addresses`, { withCredentials: true })
                .then(res => {
                    const addrs = res.data || [];
                    setSavedAddresses(addrs);

                    // Auto-fill default address
                    const defaultAddr = addrs.find(a => a.is_default === 1) || addrs[0];
                    if (defaultAddr && defaultAddr.zip_code) {
                        setPincode(defaultAddr.zip_code);
                        // Optional: Auto-check delivery for default address
                        // Mock Logic for auto-check to behave like "Check" was clicked
                        simulateDeliveryCheck(defaultAddr.zip_code);
                    }
                })
                .catch(err => console.error("Failed to fetch addresses", err));
        }
    }, [user]);

    const simulateDeliveryCheck = (pin) => {
        if (!pin || pin.length !== 6) return;
        setCheckLoading(true);
        setPincodeError(null);
        setTimeout(() => {
            const date = new Date();
            date.setDate(date.getDate() + Math.floor(Math.random() * 5) + 2); // 2-7 days
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            setDeliveryDate(date.toLocaleDateString('en-US', options));
            setCheckLoading(false);
        }, 800);
    };

    const checkDelivery = () => {
        if (pincode.length !== 6) {
            setPincodeError("Please enter a valid 6-digit pincode");
            setDeliveryDate(null);
            return;
        }
        simulateDeliveryCheck(pincode);
    };

    const handleAddressSelect = (addr) => {
        setPincode(addr.zip_code);
        setShowAddressDropdown(false);
        simulateDeliveryCheck(addr.zip_code);
    };

    // Delivery Location Handlers
    const handleLocationBannerClick = () => {
        setShowLocationModal(true);
    };

    const handleUseCurrentLocation = () => {
        setShowLocationModal(false);
        setShowMapSelector(true);
    };

    const handleSearchLocation = (query) => {
        // For now, just open the map selector
        // In future, could implement search functionality
        setShowLocationModal(false);
        setShowMapSelector(true);
    };

    const handleLocationConfirm = (locationData) => {
        setLocation(locationData);
        setShowMapSelector(false);
        toastSuccess('Delivery location updated!');

        // Update pincode for delivery check
        if (locationData.pincode) {
            setPincode(locationData.pincode);
        }
    };

    const paymentDetails = React.useMemo(() => {
        if (!product || !product.payment_details) return null;
        try {
            return typeof product.payment_details === 'string'
                ? JSON.parse(product.payment_details)
                : product.payment_details;
        } catch (e) {
            console.error("Failed to parse payment_details", e);
            return null;
        }
    }, [product]);

    useEffect(() => {
        if (paymentDetails) {
            const tabs = Object.keys(paymentDetails);
            if (tabs.length > 0) {
                setActivePaymentTab(tabs[0]);
                const institutions = Object.keys(paymentDetails[tabs[0]]);
                if (institutions.length > 0) {
                    setActiveInstitution(institutions[0]);
                }
            }
        }
    }, [paymentDetails]);

    const customizationFields = React.useMemo(() => {
        if (!product || !product.customization_fields) return null;
        try {
            const fields = typeof product.customization_fields === 'string'
                ? JSON.parse(product.customization_fields)
                : product.customization_fields;
            return Array.isArray(fields) && fields.length > 0 ? fields : null;
        } catch (e) {
            return null;
        }
    }, [product]);


    const sliderRef = React.useRef(null);

    const scrollThumbnails = (direction) => {
        if (sliderRef.current) {
            const scrollAmount = 100; // Adjust scroll amount as needed
            sliderRef.current.scrollBy({
                top: direction === 'up' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const parsePrice = (value) => Number(String(value).replace(/,/g, ""));

    useEffect(() => {
        if (product) {
            axios.get(`${API_BASE_URL}/products/${product.id}/images`)
                .then(res => {
                    const images = res.data.images.map(img => `${API_BASE_URL}${img.image_url}`);
                    // Include main product image if not in gallery
                    const mainImage = `${API_BASE_URL}${product.image}`;
                    const allImages = [mainImage, ...images];
                    // Remove duplicates just in case
                    const uniqueImages = [...new Set(allImages)];

                    setGallery(uniqueImages);
                    setSelectedImage(uniqueImages[0]);
                })
                .catch(err => {
                    console.error("Failed to fetch gallery images", err);
                    // Fallback to main image
                    const mainImage = `${API_BASE_URL}${product.image}`;
                    setGallery([mainImage]);
                    setSelectedImage(mainImage);
                });
        }
    }, [product]);



    const fetchAiSummary = async (productId) => {
        setAiLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/reviews/summary/${productId}`);
            setAiSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch AI summary");
        } finally {
            setAiLoading(false);
        }
    };

    const fetchReviews = useCallback(async (productId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/reviews/product/${productId}`);
            setReviews(res.data.reviews || []);

            if ((res.data.reviews || []).length >= 1) {
                fetchAiSummary(productId);
            } else {
                setAiSummary(null);
            }

            if (user) {
                const existing = (res.data.reviews || []).find(r => r.user_id === user.id);
                setMyReview(existing || null);
            }
        } catch (err) {
            console.error("Failed to fetch reviews");
        }
    }, [user]);

    const checkTrustDataAvailability = useCallback(async (p) => {
        if (!p) return;

        // 1. Check Price History Availability
        try {
            const historyRes = await axios.get(`${API_BASE_URL}/products/${p.id}/price-history`);
            // Show only if there are at least 2 points (or more than 1 change)
            setHasPriceHistory((historyRes.data || []).length > 1);
        } catch (e) {
            setHasPriceHistory(false);
        }

        // 2. Check Seller Vibe Availability
        try {
            const vibeRes = await axios.get(`${API_BASE_URL}/api/shops/${p.shop_id}/vibe`);
            // Show only if total_reviews > 0 and a valid score exists
            setHasVibeScore(vibeRes.data && vibeRes.data.total_vibe_reviews > 0);
        } catch (e) {
            setHasVibeScore(false);
        }
    }, []);



    useEffect(() => {
        // Scroll to top when navigating to a new product
        window.scrollTo({ top: 0, behavior: 'instant' });

        // 1. Fetch Product by Slug
        setLoading(true);
        setProduct(null); // Clear stale product data immediately

        // Reset all specific states to prevent stale data visibility
        setGroupDeal(null);
        setHasPriceHistory(false);
        setHasVibeScore(false);
        setReviews([]);
        setVariants([]);
        setGallery([]);
        setBundleProducts([]);
        setAiSummary(null);
        setSelectedSize(null);
        setSelectedAttributes({});
        setValidationErrors({});
        setQuantity(1);
        setShowPriceModal(false);
        setShowVibeModal(false);
        setShowGroupDealModal(false);
        setFoundTreasure(null);
        setSimilarProducts([]);
        setInterestedProducts([]);
        setRecentProducts([]);
        setDeliveryDate(null);
        setPincodeError(null);
        setMyReview(null);
        setCustomization({});
        setUploadingImage(false);

        const productIdParam = searchParams.get("p_id");
        let fetchUrl = `${API_BASE_URL}/products?slug=${encodeURIComponent(slug)}`;

        if (productIdParam) {
            const decId = decryptId(productIdParam);
            if (decId && decId !== 'admin') {
                fetchUrl = `${API_BASE_URL}/products?ids=${decId}`;
            }
        }

        axios.get(fetchUrl)
            .then(async (res) => {
                // Backend returns { products: [...] }
                const products = res.data.products || [];
                if (products.length > 0) {
                    const p = products[0];
                    setProduct(p);
                    fetchReviews(p.id); // Fetch Reviews after product is loaded
                    checkTrustDataAvailability(p); // Check if trust data exists

                    // Fetch variants
                    axios.get(`${API_BASE_URL}/products/${p.id}/variants`)
                        .then(vRes => setVariants(vRes.data.variants || []))
                        .catch(err => console.error("Failed to fetch variants", err));

                    // Redundant check removed
                    addRecentlyViewed(p.id);
                    fetchRecommendations(p);

                    // Price Hunt Check
                    if (p.is_hunt_target && user) {
                        axios.post(`${API_BASE_URL}/api/hunt/claim`, { product_id: p.id }, {
                            withCredentials: true
                        }).then(res => {
                            if (res.data.success) {
                                setFoundTreasure(res.data);
                            }
                        }).catch(err => {
                            // Silently fail if already claimed or other error
                        });
                    }
                } else {
                    // console.log("Product not found, will attempt to resolve as Category");
                    setProduct(null); // Ensure product is null to trigger fallback
                }
            })
            .catch((err) => {
                console.error("Failed to load product", err);
            })
            .finally(() => setLoading(false));
    }, [slug, user, fetchReviews, addRecentlyViewed, checkTrustDataAvailability, searchParams]);

    useEffect(() => {
        if (product) {
            axios.get(`${API_BASE_URL}/api/bundles/${product.id}`)
                .then(res => {
                    setBundleProducts(res.data || []);
                    setSelectedBundleIds((res.data || []).map(p => p.id)); // Default all selected
                })
                .catch(err => console.error("Failed to fetch bundles", err));
        }
    }, [product]);

    // Hierarchy State
    const [hierarchy, setHierarchy] = useState([]);

    // Fetch Group Deal Status
    useEffect(() => {
        if (product) {
            axios.get(`${API_BASE_URL}/api/group-buys/product/${product.id}`)
                .then(res => setGroupDeal(res.data))
                .catch(err => console.error("Failed to fetch group deal status", err));

            // Fetch Hierarchy
            if (product.category_id) {
                axios.get(`${API_BASE_URL}/subcategory/${product.category_id}`)
                    .then(res => {
                        const subs = res.data;
                        const currentSub = subs.find(s => s.id === product.subcategory_id) || subs.find(s => s.slug === product.subcategory_slug);

                        const path = [];

                        if (currentSub) {
                            if (currentSub.parent_id) {
                                const parentSub = subs.find(s => s.id === currentSub.parent_id);
                                if (parentSub) {
                                    path.push({
                                        name: parentSub.name,
                                        url: `/${product.category_slug}/${parentSub.slug}`
                                    });
                                }
                            }
                            path.push({
                                name: currentSub.name,
                                url: path.length > 0
                                    ? `/${product.category_slug}/${path[0].url.split('/').pop()}/${currentSub.slug}`
                                    : `/${product.category_slug}/${currentSub.slug}`
                            });
                        } else if (product.subcategory_name) {
                            // Fallback if ID match fails
                            path.push({
                                name: product.subcategory_name,
                                url: `/${product.category_slug}/${product.subcategory_slug}`
                            });
                        }
                        setHierarchy(path);
                    })
                    .catch(err => console.error("Failed to fetch hierarchy", err));
            }
        }
    }, [product]);

    const fetchRecommendations = async (p) => {
        try {
            // 1. Similar Products (Check manual selection first)
            if (p.similar_products) {
                try {
                    const ids = JSON.parse(p.similar_products);
                    if (ids.length > 0) {
                        const sRes = await axios.get(`${API_BASE_URL}/products?ids=${ids.join(',')}`);
                        setSimilarProducts(sRes.data.products || []);
                    } else if (p.subcategory_id) {
                        const sRes = await axios.get(`${API_BASE_URL}/products?subcategory_id=${p.subcategory_id}&limit=10`);
                        setSimilarProducts((sRes.data.products || []).filter(item => item.id !== p.id));
                    }
                } catch (e) {
                    console.error("Failed to fetch manual similar products", e);
                    if (p.subcategory_id) {
                        const sRes = await axios.get(`${API_BASE_URL}/products?subcategory_id=${p.subcategory_id}&limit=10`);
                        setSimilarProducts((sRes.data.products || []).filter(item => item.id !== p.id));
                    }
                }
            } else if (p.subcategory_id) {
                const sRes = await axios.get(`${API_BASE_URL}/products?subcategory_id=${p.subcategory_id}&limit=10`);
                setSimilarProducts((sRes.data.products || []).filter(item => item.id !== p.id));
            }

            // 2. You might be interested in (Same Category or Brand)
            const iRes = await axios.get(`${API_BASE_URL}/products?category_id=${p.category_id}&limit=15`);
            setInterestedProducts((iRes.data.products || []).filter(item => item.id !== p.id).slice(0, 10));

            // 3. Recently Viewed
            // Note: We'll fetch these later in another useEffect or here
        } catch (err) {
            console.error("Failed to fetch recommendations", err);
        }
    };

    useEffect(() => {
        if (recentlyViewedIds.length > 0) {
            axios.get(`${API_BASE_URL}/products?ids=${recentlyViewedIds.join(',')}`)
                .then(res => {
                    const sorted = recentlyViewedIds.map(id => (res.data.products || []).find(p => p.id === id)).filter(Boolean);
                    setRecentProducts(sorted.filter(p => product ? p.id !== product.id : true));
                })
                .catch(err => console.error("Failed to fetch recent products", err));
        }
    }, [recentlyViewedIds, product]);

    const getAvailableSizes = (prod) => {
        if (!prod || !prod.available_sizes) return [];
        try {
            if (Array.isArray(prod.available_sizes)) {
                return prod.available_sizes;
            } else if (typeof prod.available_sizes === 'string') {
                const trimmed = prod.available_sizes.trim();
                // Check if it's a JSON string
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    return JSON.parse(trimmed);
                }
                // Check if it's "S,M,L" format
                else if (trimmed.length > 0) {
                    return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
                }
            }
        } catch (e) {
            console.error("Error parsing sizes:", e);
            // Fallback for simple string splits if JSON parse fails
            return String(prod.available_sizes).split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
        return [];
    };

    const getAttributes = (prod) => {
        if (!prod || !prod.attributes) return {};
        try {
            return typeof prod.attributes === 'string' ? JSON.parse(prod.attributes) : prod.attributes;
        } catch (e) {
            console.error("Error parsing attributes:", e);
            return {};
        }
    };

    const handleAddToCart = () => {
        // if (!token) return toastError("Please login first"); // Removed for Guest Cart
        const errors = {};
        const sizes = getAvailableSizes(product);
        if (sizes.length > 0 && !selectedSize) {
            errors.size = "Please select a size";
        }

        const attributes = getAttributes(product);
        if (attributes && Object.keys(attributes).length > 0) {
            for (const key of Object.keys(attributes)) {
                if (!selectedAttributes[key]) {
                    errors[key] = `Please select ${key}`;
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear errors if any
        setValidationErrors({});

        if (product.is_customizable) {
            if (customizationFields) {
                // Validate required fields from custom schema
                const missingRequired = customizationFields.find(f => f.required && !customization[f.name]);
                if (missingRequired) {
                    return toastError(`${missingRequired.label || missingRequired.name} is required`);
                }
            } else {
                // Default validation for products without custom fields
                if (!customization.name && !customization.message) {
                    return toastError("Please provide at least a name or message for customization");
                }
            }
        }

        const customizationData = product.is_customizable ? customization : null;

        addToCart(product, selectedSize, selectedAttributes, quantity, customizationData);
    };

    const handleBuyNow = () => {
        // if (!token) return toastError("Please login first"); // Removed for Guest Checkout flow
        const errors = {};
        const sizes = getAvailableSizes(product);
        if (sizes.length > 0 && !selectedSize) {
            errors.size = "Please select a size";
        }

        const attributes = getAttributes(product);
        if (attributes && Object.keys(attributes).length > 0) {
            for (const key of Object.keys(attributes)) {
                if (!selectedAttributes[key]) {
                    errors[key] = `Please select ${key}`;
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        // Clear errors if any
        setValidationErrors({});

        if (product.is_customizable) {
            if (customizationFields) {
                const missingRequired = customizationFields.find(f => f.required && !customization[f.name]);
                if (missingRequired) {
                    return toastError(`${missingRequired.label || missingRequired.name} is required`);
                }
            } else {
                if (!customization.name && !customization.message) {
                    return toastError("Please provide at least a name or message for customization");
                }
            }
        }

        const customizationData = product.is_customizable ? customization : null;
        addToCart(product, selectedSize, selectedAttributes, quantity, customizationData);
        navigate("/checkout/");
    };

    const isWishlisted = wishlist.includes(product?.id);

    const handleWishlistToggle = () => {
        if (isWishlisted) {
            removeFromWishlist(product.id);
        } else {
            addToWishlist(product.id);
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#f1f3f6]">
            <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-brand-orange rounded-full animate-spin"></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
        </div>
    );
    // Fallback if product not found - Try rendering CategoryPage
    // This handles the conflict where /:slug/ could be a category or a product
    if (!product) {
        // We dynamically import CategoryPage to avoid circular dependencies if any
        // But since we need to render it, we should probably have imported it or handle it via a wrapper.
        // Given ProductDetails is a page, we can just return the CategoryPage component if we import it.
        // However, we didn't import CategoryPage in this file. 
        // Let's check imports.

        // Since we cannot easily import CategoryPage here without potentially causing issues or refactoring,
        // and because we just moved the Route priority in App.js,
        // we can simply allow the "Not Found" state to trigger a "Check if Category" effect?
        // No, that's too slow.

        // BETTER APPROACH:
        // Return a special "Resolver" state or Component.
        // Actually, let's just make sure we are not stuck.

        // If we really want to support both, we really should have used a Resolver component in App.js.
        // But based on the user request, "Similar Products" links (which are products) were breaking.
        // Moving the route fixed THAT.
        // Now we need to fix "Category Links" (e.g. /electronics) which will now hit this 404 block.

        // Let's assume for a moment that we can Lazy Load the Category Page here.

        return (
            <React.Suspense fallback={
                <div className="h-screen flex flex-col items-center justify-center bg-[#f1f3f6]">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-orange rounded-full animate-spin"></div>
                </div>
            }>
                {/* 
                  CategoryPage expects params from useParams(). 
                  Since we are at /:slug/, useParams() gives { slug: "electronics" }.
                  CategoryPage expects { categorySlug, subcategorySlug, brandSlug }.
                  We must mock the context or wait, useParams read from Context.
                  The current URL is /electronics.
                  So useParams() in CategoryPage will see { slug: "electronics" } NOT { categorySlug: "electronics" }.
                  
                  We need to check CategoryPage implementation.
                  It reads: const { categorySlug, subcategorySlug, brandSlug } = useParams();
                  
                  If we are here, route is /:slug/.
                  So params are { slug: "..." }.
                  categorySlug will be undefined.
                  
                  We must Explicitly PASS props to CategoryPage if it supports it, 
                  OR we rely on it handling undefined properly? No.
                  
                  We must modify CategoryPage to accept props OR we must use a Router that maps :slug to :categorySlug.
                  
                  Let's modify this component to redirect? No, redirect changes URL.
                  
                  Let's try to pass the slug as a prop `forcedCategorySlug`.
                */}
                <NotFoundHandler slug={slug} />
            </React.Suspense>
        );
    }





    const scrollToReviews = () => {
        const section = document.getElementById('reviews-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Calculate Rating Distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        if (ratingDistribution[r.rating] !== undefined) ratingDistribution[r.rating]++;
    });
    const totalRatings = reviews.length;

    return (

        <div className="bg-[#f1f3f6] min-h-screen pb-10">
            {product && (
                <SEO
                    title={product.meta_title || product.name}
                    description={product.meta_description || product.description}
                    image={`${API_BASE_URL}${product.image}`}
                    keywords={product.meta_keywords || (product.tags ? product.tags : "")}
                />
            )}

            {/* Delivery Location Modal */}
            <DeliveryLocationModal
                isOpen={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onUseCurrentLocation={handleUseCurrentLocation}
                onSearchLocation={handleSearchLocation}
            />

            {/* Delivery Map Selector */}
            <DeliveryMapSelector
                isOpen={showMapSelector}
                onConfirm={handleLocationConfirm}
                onBack={() => setShowMapSelector(false)}
            />

            <div className="max-w-[1400px] mx-auto bg-white shadow-sm">

                {/* Breadcrumb & Actions - Mobile Only (above image) */}
                <div className="block md:hidden px-3 pt-3 pb-2 border-b bg-white">
                    <div className="flex flex-col gap-2">
                        {/* Breadcrumb */}
                        <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-1">
                            <Link to="/" className="hover:text-blue-600">Home</Link>
                            <ChevronRight size={10} className="text-gray-400" />
                            {product.category_name && (
                                <>
                                    <Link to={`/${product.category_slug || '#'}`} className="hover:text-blue-600">{product.category_name}</Link>
                                    <ChevronRight size={10} className="text-gray-400" />
                                </>
                            )}
                            {hierarchy.map((item, idx) => (
                                <React.Fragment key={idx}>
                                    <Link to={item.url} className="hover:text-blue-600">{item.name}</Link>
                                    <ChevronRight size={10} className="text-gray-400" />
                                </React.Fragment>
                            ))}
                            <span className="text-gray-400 truncate max-w-[120px]">{product.name}</span>
                        </div>

                        {/* Top Actions: Compare & Share */}
                        <div className="flex items-center gap-3 justify-end">
                            <label className="flex items-center gap-1.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={compareList.includes(product?.id)}
                                    onChange={() => toggleCompare(product?.id)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-[11px] font-bold text-gray-600 group-hover:text-blue-600 transition-colors">Compare</span>
                            </label>
                            <button className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-blue-600 transition-colors">
                                <Share2 size={14} />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Container */}
                <div className="flex flex-col md:flex-row">

                    {/* --- LEFT COLUMN: Image & Actions (Sticky on Desktop) --- */}
                    <div className="w-full md:w-[40%] lg:w-[35%] p-3 sm:p-4 md:sticky md:top-[70px] md:h-[calc(100vh-100px)] overflow-y-auto">
                        {/* Image Gallery */}
                        <div className="flex flex-col-reverse md:flex-row gap-2">
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={() => scrollThumbnails('up')}
                                    className="hidden md:flex w-full h-6 items-center justify-center bg-white hover:bg-gray-200 text-gray-600 rounded-sm shadow-sm transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-5 h-5 text-gray-700 transform -rotate-90" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
                                </button>

                                <div
                                    ref={sliderRef}
                                    className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto scrollbar-hide w-full md:w-16 h-20 md:h-[350px] p-1 md:p-2"
                                >
                                    {gallery.map((img, idx) => (
                                        <img
                                            key={idx}
                                            src={img}
                                            alt={`Thumbnail ${idx}`}
                                            className={`w-14 h-14 flex-shrink-0 object-contain border rounded-sm cursor-pointer hover:border-brand-orange ${selectedImage === img ? "border-brand-orange" : "border-gray-200"}`}
                                            onClick={() => setSelectedImage(img)}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => scrollThumbnails('down')}
                                    className="hidden md:flex w-full h-6 items-center justify-center bg-white hover:bg-gray-200 text-gray-600 rounded-sm shadow-sm transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-5 h-5 text-gray-700 transform rotate-90" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
                                </button>
                            </div>

                            {/* Main Image */}
                            <div className="flex-1 border border-gray-100 bg-white relative flex justify-center items-center overflow-hidden group rounded-sm h-[300px] sm:h-[380px] md:h-[420px]">
                                <button
                                    onClick={handleWishlistToggle}
                                    className="absolute top-2 right-2 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 z-10 transition-transform hover:scale-110"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isWishlisted ? "text-red-500 fill-current" : "text-gray-400"}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                <img
                                    src={selectedImage}
                                    alt={product.name}
                                    className="max-w-full max-h-full object-contain transition-transform duration-500 md:cursor-crosshair"
                                    style={{ transformOrigin: "center center" }}
                                    onMouseMove={(e) => {
                                        if (window.innerWidth >= 768) {
                                            const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                                            const x = ((e.clientX - left) / width) * 100;
                                            const y = ((e.clientY - top) / height) * 100;
                                            e.currentTarget.style.transformOrigin = `${x}% ${y}%`;
                                            e.currentTarget.style.transform = "scale(2)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "scale(1)";
                                    }}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 py-3 sm:py-3.5 bg-orange-500 text-white font-bold text-xs sm:text-sm uppercase rounded-sm shadow-sm hover:bg-brand-orange-hover transition flex items-center justify-center gap-2"
                            >
                                <span className="text-xl"><svg className="kV7kR_" width="16" height="16" viewBox="0 0 16 15" xmlns="http://www.w3.org/2000/svg"><path className="" d="M15.32 2.405H4.887C3 2.405 2.46.805 2.46.805L2.257.21C2.208.085 2.083 0 1.946 0H.336C.1 0-.064.24.024.46l.644 1.945L3.11 9.767c.047.137.175.23.32.23h8.418l-.493 1.958H3.768l.002.003c-.017 0-.033-.003-.05-.003-1.06 0-1.92.86-1.92 1.92s.86 1.92 1.92 1.92c.99 0 1.805-.75 1.91-1.712l5.55.076c.12.922.91 1.636 1.867 1.636 1.04 0 1.885-.844 1.885-1.885 0-.866-.584-1.593-1.38-1.814l2.423-8.832c.12-.433-.206-.86-.655-.86" fill="#fff"></path></svg></span>
                                <span className="hidden sm:inline">Add to Cart</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                            <button
                                onClick={handleBuyNow}
                                className="flex-1 py-3 sm:py-3.5 bg-orange-700 text-white border border-brand-orange font-bold text-xs sm:text-sm uppercase rounded-sm shadow-sm transition flex items-center justify-center gap-2"
                            >
                                <span className="text-xl"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.00012 13.5L12 4V10.5H16.9999L12 20L12.0002 13.5H7.00012Z" stroke="#fff" strokeLinecap="round" fill="#fff" strokeLinejoin="round" />
                                </svg></span> Buy Now
                            </button>
                        </div>

                    </div>

                    {/* --- RIGHT COLUMN: Details (Scrollable) --- */}
                    <div className="w-full md:w-[60%] lg:w-[65%] p-3 sm:p-4 md:pl-6">

                        {/* Breadcrumb & Actions - Desktop Only (above product name) */}
                        <div className="hidden md:flex justify-between items-start gap-4 mb-1">
                            {/* Breadcrumb */}
                            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1">
                                <Link to="/" className="hover:text-blue-600">Home</Link>
                                <ChevronRight size={10} className="text-gray-400" />
                                {product.category_name && (
                                    <>
                                        <Link to={`/${product.category_slug || '#'}`} className="hover:text-blue-600">{product.category_name}</Link>
                                        <ChevronRight size={10} className="text-gray-400" />
                                    </>
                                )}
                                {hierarchy.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        <Link to={item.url} className="hover:text-blue-600">{item.name}</Link>
                                        <ChevronRight size={10} className="text-gray-400" />
                                    </React.Fragment>
                                ))}
                                <span className="text-gray-400 truncate max-w-[150px]">{product.name}</span>
                            </div>

                            {/* Top Actions: Compare & Share */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                                <label className="flex items-center gap-1.5 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={compareList.includes(product?.id)}
                                        onChange={() => toggleCompare(product?.id)}
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600 transition-colors">Compare</span>
                                </label>
                                <button className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors">
                                    <Share2 size={14} />
                                    <span>Share</span>
                                </button>
                            </div>
                        </div>

                        <h1 className="text-base sm:text-lg font-medium text-gray-900 mb-1 leading-tight">{product.name}</h1>

                        {/* Rating Badge & Assured */}
                        <div className="flex items-center gap-3 mb-2">
                            {product.rating_count > 0 && (
                                <div
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={scrollToReviews}
                                >
                                    <span className="bg-green-700 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                        {Number(product.avg_rating).toFixed(1)} <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z" /></svg>
                                    </span>
                                    <span className="text-sm text-gray-500 font-medium hover:underline">
                                        {product.rating_count.toLocaleString()} Ratings & {product.review_count.toLocaleString()} Reviews
                                    </span>
                                </div>
                            )}
                            {Boolean(product.is_assured) && (
                                <svg width="170" height="36" viewBox="0 0 170 36" xmlns="http://www.w3.org/2000/svg" > {/* Shield */} <path d="M18 4l12 5v9c0 8-12 14-12 14S6 26 6 18V9l12-5z" fill="#2874F0" /> <path d="M18 7l9 4v7c0 6-9 11-9 11s-9-5-9-11v-7l9-4z" fill="#FFD700" /> <path d="M14 16l3 3 6-6" fill="none" stroke="#2874F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> {/* Text */} <text x="30" y="24" fill="#1F3BB3" fontSize="18" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" > Assured </text> </svg>
                            )}
                        </div>

                        {/* Price Section */}
                        <div className="mb-4">
                            <span className="text-green-700 font-bold text-sm block mb-1">
                                Extra {formatPrice(parsePrice(product.price) - parsePrice(product.sale_price))} off
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-gray-900 leading-none">
                                    {formatPrice(parsePrice(product.sale_price))}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 line-through text-base">
                                        {formatPrice(parsePrice(product.price))}
                                    </span>
                                    <span className="text-green-700 font-bold text-base">
                                        {Math.round(((parsePrice(product.price) - parsePrice(product.sale_price)) / parsePrice(product.price)) * 100)}% off
                                    </span>
                                    <div className="group relative">
                                        <Info size={14} className="text-gray-400 cursor-pointer" />
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white shadow-xl border rounded p-3 z-50 hidden group-hover:block">
                                            <div className="text-xs space-y-2">
                                                <div className="flex justify-between"><span>MRP:</span><span className="line-through">{formatPrice(parsePrice(product.price))}</span></div>
                                                <div className="flex justify-between font-bold"><span>Sale Price:</span><span>{formatPrice(parsePrice(product.sale_price))}</span></div>
                                                <div className="text-[10px] text-gray-400 text-center">Inclusive of all taxes</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust & Alert Badges - Consolidated Actions */}
                        <div className="flex flex-wrap gap-2 mt-4 mb-4">
                            {hasPriceHistory && (
                                <button
                                    onClick={() => setShowPriceModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 transition-all hover:bg-blue-100"
                                >
                                    <TrendingUp size={14} className="text-blue-500" />
                                    <span className="text-[11px] font-black uppercase tracking-tight">Price History</span>
                                </button>
                            )}
                            {hasVibeScore && (
                                <button
                                    onClick={() => setShowVibeModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 transition-all hover:bg-green-100"
                                >
                                    <ShieldCheck size={14} className="text-green-500" />
                                    <span className="text-[11px] font-black uppercase tracking-tight">Seller Vibe</span>
                                </button>
                            )}

                            <button
                                onClick={async () => {
                                    if (!user) return toastError("Please login to set alerts");
                                    try {
                                        const alertType = (product.stock > 0) ? 'price_drop' : 'restock';
                                        await axios.post(`${API_BASE_URL}/api/alerts/subscribe`, {
                                            product_id: product.id,
                                            alert_type: alertType,
                                            target_price: product.sale_price // Current price as reference for drop
                                        }, {
                                            withCredentials: true
                                        });
                                        toastSuccess(`Alert set for ${alertType === 'restock' ? 'Restock' : 'Price Drop'}!`);
                                    } catch (err) {
                                        if (err.response?.status === 409) {
                                            toastError("You are already subscribed!");
                                        } else {
                                            toastError("Failed to subscribe");
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full border border-orange-100 transition-all hover:bg-orange-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                <span className="text-[11px] font-black uppercase tracking-tight">
                                    {product.stock > 0 ? "Notify on Price Drop" : "Notify When Available"}
                                </span>
                            </button>

                            {/* Conditional Group Deal Button */}
                            {groupDeal && (groupDeal.status === 'active' || groupDeal.status === 'expired') && (
                                <button
                                    onClick={() => setShowGroupDealModal(true)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:shadow-md hover:scale-105 ${groupDeal.status === 'active'
                                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-100"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                        }`}
                                >
                                    <Zap size={14} className={groupDeal.status === 'active' ? "text-yellow-300 fill-yellow-300" : "text-gray-400"} />
                                    <span className="text-[11px] font-black uppercase tracking-tight">
                                        {groupDeal.status === 'active' ? "Join Group Deal" : "Group Deal Ended"}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Dynamic Offers */}
                        {product.offers && (typeof product.offers === 'string' ? JSON.parse(product.offers) : product.offers).length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-base text-gray-900 mb-2">Available offers</h3>
                                <div className="space-y-2">
                                    {(showAllOffers
                                        ? (typeof product.offers === 'string' ? JSON.parse(product.offers) : product.offers)
                                        : (typeof product.offers === 'string' ? JSON.parse(product.offers) : product.offers).slice(0, 4)
                                    ).map((offer, idx) => (
                                        <div key={idx} className="flex items-start gap-2 group">
                                            <svg className="w-5 h-5 text-green-700 transform scale-x-[-1] dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"> <path d="M18.045 3.007 12.31 3a1.965 1.965 0 0 0-1.4.585l-7.33 7.394a2 2 0 0 0 0 2.805l6.573 6.631a1.957 1.957 0 0 0 1.4.585 1.965 1.965 0 0 0 1.4-.585l7.409-7.477A2 2 0 0 0 21 11.479v-5.5a2.972 2.972 0 0 0-2.955-2.972Zm-2.452 6.438a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" /> </svg>
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="text-sm text-gray-800">
                                                    <span className="font-bold">{typeof offer === 'string' ? offer.split(' ')[0] : (offer.text || '').split(' ')[0]}</span> {typeof offer === 'string' ? offer.split(' ').slice(1).join(' ') : (offer.text || '').split(' ').slice(1).join(' ')}
                                                </span>
                                                {typeof offer !== 'string' && offer.tc && (
                                                    <button
                                                        onClick={() => {
                                                            setActiveTCContent(offer.tc);
                                                            setShowTCModal(true);
                                                        }}
                                                        className="text-blue-600 font-bold text-[11px] uppercase hover:underline"
                                                    >
                                                        T&C
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {JSON.parse(product.offers || '[]').length > 4 && (
                                        <button
                                            onClick={() => setShowAllOffers(!showAllOffers)}
                                            className="text-blue-600 font-bold text-sm ml-7 hover:underline"
                                        >
                                            {showAllOffers ? "View Less" : `View ${JSON.parse(product.offers).length - 4} more offers`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Exchange UI Section - Only show if exchange is available */}
                        {!!product.exchange_available && (
                            <div className="mb-6 border rounded shadow-sm overflow-hidden bg-white max-w-[500px]">
                                <div className={`p-4 cursor-pointer border-b transition-colors flex items-center justify-between ${!product.is_exchange ? 'bg-blue-50/50 border-blue-100' : 'hover:bg-gray-50'}`}
                                    onClick={() => setProduct(prev => ({ ...prev, is_exchange: false }))}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!product.is_exchange ? 'border-blue-600' : 'border-gray-300'}`}>
                                            {!product.is_exchange && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">Buy without Exchange</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{formatPrice(parsePrice(product.sale_price))}</span>
                                </div>
                                <div className={`p-4 cursor-pointer transition-colors ${product.is_exchange ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    onClick={() => setProduct(prev => ({ ...prev, is_exchange: true }))}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${product.is_exchange ? 'border-blue-600' : 'border-gray-300'}`}>
                                            {product.is_exchange && <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>}
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">Buy with Exchange</span>
                                        <span className="text-sm text-gray-500">up to {formatPrice(product.exchange_discount || 32850)} off</span>
                                    </div>
                                    {product.is_exchange && (
                                        <div className="ml-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 border-b-2 border-orange-500 pb-1 w-fit mb-1">
                                                <input
                                                    placeholder="Enter pincode"
                                                    className="bg-transparent text-sm font-bold outline-none placeholder:text-gray-400 placeholder:font-normal"
                                                    value={pincode}
                                                    onChange={(e) => setPincode(e.target.value)}
                                                />
                                                <button className="text-blue-600 font-bold text-xs uppercase">Check</button>
                                            </div>
                                            <p className="text-[11px] text-red-500 font-medium">Enter pincode to check if exchange is available</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Warranty/Brand Block - Only show if warranty info is available */}
                        {!!product.warranty && (
                            <div className="mb-6 flex items-center gap-6 p-4 border rounded shadow-sm bg-white max-w-[500px]">
                                <img
                                    src={`${API_BASE_URL}${product.shop_logo || '/default-brand.png'}`}
                                    alt="Brand"
                                    className="w-12 h-12 object-contain"
                                />
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-bold text-gray-900">{product.warranty}</span>
                                    {product.warranty_details && (
                                        <button
                                            onClick={() => {
                                                setActiveTCContent(product.warranty_details);
                                                setShowTCModal(true);
                                            }}
                                            className="text-blue-600 font-bold text-xs hover:underline text-left"
                                        >
                                            Know More
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        <div className="mb-6 mt-6 flex items-center gap-4 w-full">
                            <div className="text-gray-500 font-bold text-xs uppercase tracking-widest w-28 flex-shrink-0">Quantity</div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all shadow-sm active:scale-90"
                                    disabled={quantity <= 1}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-14 h-10 text-center border-0 border-b-2 border-transparent focus:border-brand-orange bg-gray-50 rounded-md font-black text-gray-900 focus:outline-none transition-all"
                                />
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all shadow-sm active:scale-90"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Delivery Location - Mobile Only */}
                        <div className="mb-6 md:hidden w-full">
                            <button
                                onClick={handleLocationBannerClick}
                                className="w-full bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white px-4 py-3 cursor-pointer hover:from-[#153f25] hover:to-[#25583f] transition-all duration-200 shadow-md rounded-lg"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            {selectedLocation && selectedLocation.address ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-green-200">Deliver to</span>
                                                    <span className="text-sm font-semibold truncate">
                                                        {selectedLocation.address.length > 35
                                                            ? selectedLocation.address.substring(0, 35) + '...'
                                                            : selectedLocation.address}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">Location not set</span>
                                                    <span className="text-green-300 text-sm font-semibold">Select delivery location</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-green-200">
                                        <path d="m9 18 6-6-6-6"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>

                        {/* Delivery Check - Desktop Only */}
                        <div className="mb-6 hidden md:flex items-start gap-4 w-full relative z-20" ref={wrapperRef}>
                            <div className="text-gray-500 font-bold text-xs uppercase tracking-widest w-28 flex-shrink-0 mt-2">Delivery</div>
                            <div className="flex-1">
                                <div className="relative">
                                    <div className="flex items-center gap-3 border-b border-gray-200 focus-within:border-brand-orange pb-2 w-72 max-w-full transition-colors group">
                                        <span className="text-gray-400 group-focus-within:text-brand-orange transition-colors">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Enter Delivery Pincode"
                                            className="outline-none text-sm font-black text-gray-800 flex-1 placeholder:text-gray-300 placeholder:font-medium"
                                            value={pincode}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setPincode(val);
                                                if (pincodeError) setPincodeError(null);
                                                if (deliveryDate) setDeliveryDate(null); // Reset date on change
                                            }}
                                            onFocus={() => setShowAddressDropdown(true)}
                                            maxLength={6}
                                        />
                                        {checkLoading ? (
                                            <div className="w-4 h-4 rounded-full border-2 border-brand-orange border-t-transparent animate-spin"></div>
                                        ) : deliveryDate ? (
                                            <button
                                                onClick={() => {
                                                    setPincode("");
                                                    setDeliveryDate(null);
                                                    document.querySelector('input[placeholder="Enter Delivery Pincode"]')?.focus();
                                                }}
                                                className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-colors"
                                            >
                                                Change
                                            </button>
                                        ) : (
                                            <button onClick={checkDelivery} className="text-brand-orange font-black text-xs uppercase tracking-widest hover:text-brand-orange-hover transition-colors">Check</button>
                                        )}
                                    </div>

                                    {/* Saved Addresses Dropdown */}
                                    {showAddressDropdown && savedAddresses.length > 0 && (
                                        <div className="absolute top-full left-0 w-72 bg-white border border-gray-200 shadow-xl rounded-b-lg mt-0.5 z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="p-2 bg-gray-50 border-b text-[10px] font-bold text-gray-500 uppercase tracking-widest">From Saved Addresses</div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {savedAddresses.map((addr) => (
                                                    <div
                                                        key={addr.id}
                                                        onClick={() => handleAddressSelect(addr)}
                                                        className="p-3 hover:bg-gray-50 cursor-pointer flex flex-col gap-1 border-b last:border-0"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-black text-gray-900">{addr.zip_code}</span>
                                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium px-2">{addr.type}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 truncate w-full block">
                                                            {addr.address_line1}, {addr.city}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {pincodeError ? (
                                    <p className="mt-2 text-[10px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1">{pincodeError}</p>
                                ) : deliveryDate && !checkLoading ? (
                                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        <span className="text-[11px] font-bold text-gray-700">Delivery by <span className="text-green-700">{deliveryDate}</span></span>
                                        <span className="text-[10px] font-black text-green-600 border-l border-green-200 pl-2 ml-1">FREE</span>
                                    </div>
                                ) : !checkLoading && (
                                    <p className="mt-2 text-[10px] text-gray-400 font-medium">Please enter pincode to check delivery availability</p>
                                )}
                            </div>
                        </div>

                        {/* Size Selection */}
                        {
                            getAvailableSizes(product).length > 0 && (
                                <div className="flex items-start gap-4 w-full mb-6">
                                    {/* LEFT LABEL */}
                                    <div className="text-gray-500 font-bold text-xs uppercase tracking-widest w-28 flex-shrink-0 mt-2">
                                        Select Size
                                    </div>
                                    {/* RIGHT OPTIONS + SIZE CHART */}
                                    <div className="flex-1">
                                        {/* Size Chart Link */}
                                        {product.size_chart && (
                                            <button className="text-brand-orange font-bold text-sm mb-2 hover:underline">
                                                Size Chart
                                            </button>
                                        )}
                                        {/* Size Options */}
                                        <div className="flex gap-2 flex-wrap mt-1">
                                            {getAvailableSizes(product).map((size) => {
                                                const cleanSize = typeof size === 'string' ? size.trim() : size;
                                                return (
                                                    <button
                                                        key={cleanSize}
                                                        onClick={() => {
                                                            setSelectedSize(cleanSize);
                                                            setValidationErrors(prev => {
                                                                const next = { ...prev };
                                                                delete next.size;
                                                                return next;
                                                            });
                                                        }}
                                                        className={`w-12 h-10 border rounded-sm flex items-center justify-center text-sm font-bold transition-all ${selectedSize === cleanSize ? "border-brand-orange text-brand-orange bg-orange-50 ring-1 ring-brand-orange" : "border-gray-300 text-gray-800 hover:border-brand-orange"}`} >
                                                        {cleanSize}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {validationErrors.size && (
                                            <p className="mt-2 text-xs text-red-500 font-bold animate-in fade-in slide-in-from-top-1">
                                                {validationErrors.size}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        }


                        {/* Dynamic Attributes (Specs) */}
                        {
                            Object.keys(getAttributes(product)).length > 0 && (
                                <div className="flex flex-col gap-4 mb-6">
                                    {Object.entries(getAttributes(product)).map(([key, value]) => {
                                        const options = Array.isArray(value) ? value : [value];
                                        return (
                                            <div key={key} className="flex gap-4 w-full">
                                                {/* LEFT LABEL */}
                                                <div className="text-gray-500 font-bold text-xs w-28 flex-shrink-0 uppercase">
                                                    {key}
                                                </div>
                                                {/* RIGHT OPTIONS */}
                                                <div className="flex-1 flex gap-2 flex-wrap">
                                                    {options.map((val, idx) => {
                                                        const isSelected = selectedAttributes[key] === val;
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    setSelectedAttributes(prev => ({ ...prev, [key]: val }));
                                                                    setValidationErrors(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[key];
                                                                        return next;
                                                                    });
                                                                }}
                                                                className={`px-4 py-2 text-sm font-bold border rounded-sm transition-all ${isSelected
                                                                    ? "border-brand-orange text-brand-orange bg-orange-50 ring-1 ring-brand-orange"
                                                                    : "border-gray-300 text-gray-800 hover:border-brand-orange"
                                                                    }`}
                                                            >
                                                                {String(val)}
                                                            </button>
                                                        );
                                                    })}
                                                    {validationErrors[key] && (
                                                        <p className="mt-2 mb-0 text-xs text-red-500 font-bold animate-in fade-in slide-in-from-top-1 w-full">
                                                            {validationErrors[key]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        }



                        {/* Color Variants Section */}
                        {variants.length > 0 && (
                            <div className="flex items-start gap-4 mb-6">
                                <div className="text-gray-500 font-bold text-xs uppercase tracking-widest w-28 flex-shrink-0 mt-3">Color</div>
                                <div className="flex-1 flex flex-wrap gap-2">
                                    {variants.map((variant) => (
                                        <Link
                                            key={variant.id}
                                            to={`/product/${variant.slug}/`}
                                            className={`w-14 h-14 border-2 rounded transition-all p-1 hover:border-blue-600 ${slug === variant.slug ? 'border-blue-600 shadow-sm' : 'border-gray-200'}`}
                                        >
                                            <img
                                                src={`${API_BASE_URL}${variant.image}`}
                                                alt={variant.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}


                        <div className="flex flex-col md:flex-row gap-6 w-full">
                            {/* Highlights Section */}
                            {product.highlights && (typeof product.highlights === 'string' ? JSON.parse(product.highlights) : product.highlights).length > 0 && (
                                <div className="flex gap-2 md:w-1/2">
                                    <div className="text-gray-500 font-bold text-xs w-20 flex-shrink-0 uppercase">Highlights</div>
                                    <div className="flex-1">
                                        <ul className="list-disc list-outside text-sm space-y-2 text-gray-700 px-3">
                                            {(typeof product.highlights === 'string' ? JSON.parse(product.highlights) : product.highlights).map((hl, idx) => {
                                                // Check if highlight contains "T&C" or "T&amp;C"
                                                const tcRegex = /(T&C|T&amp;C)/i;
                                                const hasTc = tcRegex.test(hl);

                                                if (hasTc) {
                                                    // Split the text at T&C
                                                    const parts = hl.split(tcRegex);
                                                    return (
                                                        <li key={idx}>
                                                            {parts.map((part, partIdx) => {
                                                                if (part && part.match(tcRegex)) {
                                                                    return (
                                                                        <button
                                                                            key={partIdx}
                                                                            onClick={() => {
                                                                                setActiveTCContent("Please check the 'Available offers' section for detailed terms and conditions related to this feature.");
                                                                                setShowTCModal(true);
                                                                            }}
                                                                            className="text-blue-600 font-bold text-sm hover:underline mx-1"
                                                                        >
                                                                            T&C
                                                                        </button>
                                                                    );
                                                                }
                                                                return <span key={partIdx}>{part}</span>;
                                                            })}
                                                        </li>
                                                    );
                                                }
                                                return <li key={idx}>{hl}</li>;
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Easy Payment Options Section */}
                            {product.payment_options && (typeof product.payment_options === 'string' ? JSON.parse(product.payment_options) : product.payment_options).length > 0 && (
                                <div className="flex gap-2 md:w-1/2">
                                    <div className="text-gray-500 font-bold text-xs w-20 flex-shrink-0 uppercase">Payment Options</div>
                                    <div className="flex-1">
                                        <ul className="list-disc list-outside text-sm space-y-2 text-gray-700 px-3">
                                            {(typeof product.payment_options === 'string' ? JSON.parse(product.payment_options) : product.payment_options).map((opt, idx) => (
                                                <li key={idx}>{opt}</li>
                                            ))}
                                        </ul>
                                        {paymentDetails && (
                                            <button
                                                onClick={() => setShowPaymentModal(true)}
                                                className="text-blue-600 font-bold text-sm hover:underline mt-3 block"
                                            >
                                                View Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Seller Details */}
                        {
                            product.shop_name && (
                                <div className="flex flex-col md:flex-row gap-6 w-full mb-6 mt-2">
                                    <div className="flex gap-2 w-full">
                                        <div className="text-gray-800 font-bold text-sm w-20 flex-shrink-0">Seller</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="text-sm font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/shop/${product.shop_slug}/`)}>
                                                    {product.shop_name}
                                                </div>
                                                {product.seller_status === 'APPROVED' && (
                                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            <ul className="list-disc list-outside text-sm space-y-1 text-gray-700 px-3">
                                                <li className="font-bold text-gray-900">
                                                    {product.is_cancellable === 0 ? (
                                                        <span className="text-red-600">Non-cancellable</span>
                                                    ) : (
                                                        <span className="text-green-700">{product.cancellation_duration || 7} Days Cancellation Policy</span>
                                                    )}
                                                </li>
                                                <li>7 Days Replacement Policy</li>
                                                <li>GST invoice available</li>
                                                {product.is_active === 1 && <li>Authorized Seller</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Customization Form */}
                        {product.is_customizable === 1 && (
                            <div className="mb-3 p-0 bg-orange-50/30">

                                <div className="flex flex-col gap-1">
                                    {customizationFields ? (
                                        customizationFields.map((field, idx) => (
                                            <div key={idx} className="flex items-start gap-4 w-full mb-3">
                                                <label className="text-gray-500 font-bold text-xs uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">
                                                    {field.label || field.name}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>

                                                <div className="flex-1">
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm h-16 resize-none transition-colors"
                                                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                                                            value={customization[field.name] || ""}
                                                            onChange={(e) => setCustomization(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        />
                                                    ) : field.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm transition-colors"
                                                            value={customization[field.name] || ""}
                                                            onChange={(e) => setCustomization(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        />
                                                    ) : field.type === 'image' ? (
                                                        <div className="flex items-center gap-4">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;

                                                                    const formData = new FormData();
                                                                    formData.append("image", file);

                                                                    setUploadingImage(true);
                                                                    try {
                                                                        const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
                                                                            headers: { "Content-Type": "multipart/form-data" }
                                                                        });
                                                                        setCustomization(prev => ({ ...prev, [field.name]: res.data.imageUrl }));
                                                                        toastSuccess("Image uploaded successfully");
                                                                    } catch (err) {
                                                                        toastError("Failed to upload image");
                                                                    } finally {
                                                                        setUploadingImage(false);
                                                                    }
                                                                }}
                                                            />
                                                            {customization[field.name] && (
                                                                <div className="relative">
                                                                    <img src={`${API_BASE_URL}${customization[field.name]}`} alt="Preview" className="w-12 h-12 object-cover border rounded-sm" />
                                                                    <button
                                                                        onClick={() => setCustomization(prev => ({ ...prev, [field.name]: "" }))}
                                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 border border-gray-200 rounded-3xl focus:border-brand-orange outline-none text-sm transition-colors"
                                                            placeholder={field.placeholder || `Enter ${field.label || field.name}`}
                                                            value={customization[field.name] || ""}
                                                            onChange={(e) => setCustomization(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <div className="flex items-start gap-4 mb-4">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Name</label>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm transition-colors"
                                                        placeholder="Enter name to be printed/engraved"
                                                        value={customization.name || ""}
                                                        onChange={(e) => setCustomization(prev => ({ ...prev, name: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Occasion</label>
                                                <div className="flex-1">
                                                    <select
                                                        className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm bg-white transition-colors"
                                                        value={customization.occasion || ""}
                                                        onChange={(e) => setCustomization(prev => ({ ...prev, occasion: e.target.value }))}
                                                    >
                                                        <option value="">Select Occasion</option>
                                                        <option value="Birthday">Birthday</option>
                                                        <option value="Anniversary">Anniversary</option>
                                                        <option value="Wedding">Wedding</option>
                                                        <option value="Valentine">Valentine</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4 md:col-span-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Message</label>
                                                <div className="flex-1">
                                                    <textarea
                                                        className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm h-16 resize-none transition-colors"
                                                        placeholder="Enter your message here..."
                                                        value={customization.message || ""}
                                                        onChange={(e) => setCustomization(prev => ({ ...prev, message: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Recipient</label>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm transition-colors"
                                                        placeholder="Who is this for?"
                                                        value={customization.recipient || ""}
                                                        onChange={(e) => setCustomization(prev => ({ ...prev, recipient: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Date</label>
                                                <div className="flex-1">
                                                    <input
                                                        type="date"
                                                        className="w-full p-2 border border-gray-200 rounded-sm focus:border-brand-orange outline-none text-sm transition-colors"
                                                        value={customization.deliveryDate || ""}
                                                        onChange={(e) => setCustomization(prev => ({ ...prev, deliveryDate: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 mb-4 md:col-span-2 text-left">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest w-28 flex-shrink-0 mt-2 text-left">Image</label>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100"
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;

                                                                const formData = new FormData();
                                                                formData.append("image", file);

                                                                setUploadingImage(true);
                                                                try {
                                                                    const res = await axios.post(`${API_BASE_URL}/api/uploads`, formData, {
                                                                        headers: { "Content-Type": "multipart/form-data" }
                                                                    });
                                                                    setCustomization(prev => ({ ...prev, image: res.data.imageUrl }));
                                                                    toastSuccess("Image uploaded successfully");
                                                                } catch (err) {
                                                                    toastError("Failed to upload image");
                                                                } finally {
                                                                    setUploadingImage(false);
                                                                }
                                                            }}
                                                        />
                                                        {customization.image && (
                                                            <div className="relative">
                                                                <img src={`${API_BASE_URL}${customization.image}`} alt="Preview" className="w-12 h-12 object-cover border rounded-sm" />
                                                                <button
                                                                    onClick={() => setCustomization(prev => ({ ...prev, image: "" }))}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        )}
                                                        {uploadingImage && <span className="text-xs text-brand-orange animate-pulse">Uploading...</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Frequently Bought Together */}
                        {
                            bundleProducts.length > 0 && (
                                <div className="my-6 p-6 border border-gray-200 rounded-sm bg-white">
                                    <h3 className="text-lg font-bold text-gray-800 mb-6">Frequently bought together</h3>
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        {/* Main Product */}
                                        <div className="flex flex-col items-center w-32">
                                            <div className="w-24 h-24 border rounded-sm p-2 mb-2">
                                                <img src={`${API_BASE_URL}${product.image}`} alt={product.name} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="text-[10px] font-bold text-center line-clamp-2 h-8 text-gray-700">{product.name}</div>
                                            <div className="text-xs font-bold mt-1 text-gray-900">{formatPrice(parsePrice(product.sale_price))}</div>
                                        </div>

                                        {bundleProducts.map((p, idx) => (
                                            <React.Fragment key={p.id}>
                                                <div className="text-gray-400">
                                                    <Plus size={24} />
                                                </div>
                                                <div className="flex flex-col items-center w-32 relative">
                                                    <div className="absolute top-0 -right-[10px]">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBundleIds.includes(p.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedBundleIds([...selectedBundleIds, p.id]);
                                                                } else {
                                                                    setSelectedBundleIds(selectedBundleIds.filter(id => id !== p.id));
                                                                }
                                                            }}
                                                            className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="w-24 h-24 border rounded-sm p-2 mb-2">
                                                        <img src={`${API_BASE_URL}${p.image}`} alt={p.name} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="text-[10px] font-bold text-center line-clamp-2 h-8 text-gray-700 hover:text-blue-600 cursor-pointer" onClick={() => navigate(generateProductUrl(p, null, null, { otracker: 'bought_together', otracker1: 'product_details' }))}>{p.name}</div>
                                                    <div className="text-xs font-bold mt-1 text-gray-900">{formatPrice(parsePrice(p.sale_price))}</div>
                                                </div>
                                            </React.Fragment>
                                        ))}

                                        <div className="flex-1 md:pl-10 flex flex-col items-center md:items-end mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full">
                                            <div className="text-2xl font-bold text-gray-900 mb-1">
                                                {formatPrice(
                                                    parsePrice(product.sale_price) +
                                                    bundleProducts
                                                        .filter(p => selectedBundleIds.includes(p.id))
                                                        .reduce((sum, p) => sum + parsePrice(p.sale_price), 0)
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-4">Total for {selectedBundleIds.length + 1} items</p>
                                            <button
                                                onClick={async () => {
                                                    const itemsToAdd = [
                                                        { product, quantity: 1 },
                                                        ...bundleProducts
                                                            .filter(p => selectedBundleIds.includes(p.id))
                                                            .map(p => ({ product: p, quantity: 1 }))
                                                    ];
                                                    addMultipleToCart(itemsToAdd);
                                                }}
                                                className="w-full md:w-auto px-8 py-3 bg-[#ffd814] hover:bg-[#f7ca00] text-black font-bold text-sm uppercase rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 border border-[#fcd200]"
                                            >
                                                <Plus size={18} /> Add All {selectedBundleIds.length + 1} to Cart
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* Product Features Section */}
                        {product.product_features && (() => {
                            try {
                                const features = typeof product.product_features === 'string'
                                    ? JSON.parse(product.product_features)
                                    : product.product_features;

                                if (!Array.isArray(features) || features.length === 0) return null;

                                return (
                                    <div className="space-y-12 my-12 border p-4">
                                        <div className="text-center space-y-2">
                                            <h2 className="text-2xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">Product Features</h2>
                                            <div className="w-20 h-1.5 bg-brand-orange mx-auto rounded-full"></div>
                                        </div>

                                        <div className="space-y-16 md:space-y-24">
                                            {features.map((feature, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}
                                                >
                                                    {/* Feature Image */}
                                                    {feature.image && (
                                                        <div className="w-full md:w-1/2 group overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500">
                                                            <img
                                                                src={feature.image.startsWith('http') ? feature.image : `${API_BASE_URL}${feature.image}`}
                                                                alt={feature.title}
                                                                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Feature Text */}
                                                    <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
                                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                                                            {feature.title}
                                                        </h3>
                                                        <div className="w-12 h-1 bg-brand-orange rounded-full mx-auto md:mx-0"></div>
                                                        <p className="text-gray-600 text-base md:text-lg leading-relaxed font-medium">
                                                            {feature.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            } catch (e) {
                                return null;
                            }
                        })()}

                        {/* Specifications / Highlights */}
                        <div className="border rounded-sm">
                            <div className="p-4 border-b bg-gray-50 text-center space-y-2">
                                <h3 className="text-2xl md:text-2xl font-black text-gray-900 uppercase tracking-tight">Specifications for {product.name}</h3>
                                <div className="w-20 h-1.5 bg-brand-orange mx-auto rounded-full"></div>
                            </div>
                            <div className={`p-4 bg-white text-sm text-gray-700 space-y-2 transition-all duration-300 ${!showAllSpecs ? 'max-h-[300px] overflow-hidden relative' : ''}`}>
                                <p>{product.description || "No description available."}</p>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-gray-500 block font-bold">Brand</span>
                                        <span className="font-medium">{product.brand || "Generic"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block font-bold">Stock</span>
                                        <span className={`font-medium ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-pink-700' : 'text-red-600'}`}>
                                            {product.stock > 10
                                                ? 'In Stock'
                                                : product.stock > 0
                                                    ? `Only ${product.stock} left`
                                                    : 'Out of Stock'}
                                        </span>
                                    </div>

                                    {/* Dynamic Specifications */}
                                    {product.specifications && Object.entries(typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications).map(([key, val], idx) => (
                                        <div key={idx}>
                                            <span className="text-gray-500 block font-bold">{key}</span>
                                            <span className="font-medium">{val}</span>
                                        </div>
                                    ))}
                                </div>

                                {!showAllSpecs && (
                                    <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAllSpecs(!showAllSpecs)}
                                className="w-full py-3 text-blue-600 font-bold text-sm hover:bg-gray-50 border-t transition-colors uppercase tracking-wide"
                            >
                                {showAllSpecs ? "Read Less" : "Read More"}
                            </button>
                        </div>

                        {/* Ratings & Reviews Section (UPDATED) */}
                        <div id="reviews-section" className="mt-6 border rounded-sm">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-800">Ratings & Reviews</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate(generateWriteReviewUrl(product))}
                                        className="text-brand-orange font-medium text-sm shadow-sm border px-4 py-1.5 bg-white rounded-sm hover:shadow-md transition"
                                    >
                                        {myReview ? "Edit Review" : "Rate Product"}
                                    </button>
                                    {reviews.length > 3 && (
                                        <button
                                            onClick={() => navigate(generateProductReviewsUrl(product))}
                                            className="text-blue-600 font-medium text-sm hover:bg-blue-50 px-3 py-1.5 rounded-sm transition"
                                        >
                                            All {reviews.length} Reviews &gt;
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Rating Graph */}
                            {reviews.length > 0 && (
                                <div className="p-6 border-b flex flex-col sm:flex-row gap-8 items-center sm:items-start">
                                    {/* Left: Big Rating */}
                                    <div className="text-center sm:text-left">
                                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                                            <span className="text-3xl font-bold text-gray-800">
                                                {Number(product.avg_rating).toFixed(1)} <span className="text-2xl">★</span>
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm">
                                            {product.rating_count.toLocaleString()} Ratings & <br />
                                            {product.review_count.toLocaleString()} Reviews
                                        </p>
                                    </div>

                                    {/* Middle: Bars */}
                                    <div className="flex-1 w-full max-w-md space-y-1">
                                        {[5, 4, 3, 2, 1].map(star => {
                                            const count = ratingDistribution[star];
                                            const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                                            // Colors: 5,4,3 (Green), 2 (Orange), 1 (Red)
                                            let colorClass = "bg-[#388e3c]"; // Green
                                            if (star === 2) colorClass = "bg-brand-orange"; // Orange
                                            if (star === 1) colorClass = "bg-red-500"; // Red

                                            return (
                                                <div key={star} className="flex items-center gap-3 text-sm">
                                                    <span className="font-bold w-6 text-right text-gray-600 contents">{star} ★</span>
                                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${colorClass}`}
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-gray-500 text-xs w-8 text-right font-medium">{count.toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* AI Summary Section */}
                            {(aiLoading || aiSummary) && (
                                <div className="p-6 border-b bg-brand-orange/5 relative overflow-hidden">
                                    {/* Decorator Gradient */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange opacity-5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="bg-brand-orange text-white p-1 rounded-full animate-pulse">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3 1.912 4.912L19.824 9.824 14.912 11.736 13 16.648l-1.912-4.912L6.176 11.736l4.912-1.912L12 3z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">AI Powered Summary</h4>
                                        {aiLoading && <span className="text-[10px] text-brand-orange animate-bounce ml-2 font-bold">Analyzing...</span>}
                                    </div>

                                    {aiLoading ? (
                                        <div className="space-y-3">
                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-full"></div>
                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6"></div>
                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-4/6"></div>
                                        </div>
                                    ) : aiSummary?.summary && aiSummary.summary !== "Not enough reviews yet for an AI summary." ? (
                                        <div className="relative z-10">
                                            <p className="text-sm text-gray-700 italic leading-relaxed mb-4">
                                                "{aiSummary.summary}"
                                            </p>
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center mt-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-green-700 uppercase">Pros</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {aiSummary.pros?.map((p, i) => (
                                                                <span key={i} className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">{p}</span>
                                                            ))}
                                                            {(!aiSummary.pros || aiSummary.pros.length === 0) && <span className="text-[10px] text-gray-400">Analysis ongoing</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="w-5 h-5 bg-red-50 rounded-full flex items-center justify-center mt-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xs font-bold text-red-700 uppercase">Cons</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {aiSummary.cons?.map((c, i) => (
                                                                <span key={i} className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">{c}</span>
                                                            ))}
                                                            {(!aiSummary.cons || aiSummary.cons.length === 0) && <span className="text-[10px] text-gray-400">None detected</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">Collect more reviews to see AI-powered shopping insights.</p>
                                    )}
                                </div>
                            )}

                            <div className="divide-y divide-gray-100">
                                {reviews.length > 0 ? (
                                    <>
                                        {reviews.slice(0, visibleReviewsCount).map(review => (
                                            <div key={review.id} className="p-6 sm:p-6 pt-3 pb-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-white text-xs font-bold px-1.5 py-0.5 rounded-[2px] flex items-center gap-1 ${review.rating >= 4 ? "bg-green-600" : review.rating >= 3 ? "bg-green-500" : review.rating >= 2 ? "bg-orange-400" : "bg-red-500"
                                                        }`}>
                                                        {review.rating} ★
                                                    </span>
                                                    <span className="font-medium text-sm text-gray-900">{review.comment}</span>
                                                </div>

                                                {/* Review Images Preview */}
                                                {review.images && (
                                                    <div className="flex gap-2 mb-2 mt-2">
                                                        {(() => {
                                                            try {
                                                                const imgs = typeof review.images === 'string' ? JSON.parse(review.images) : review.images;
                                                                return Array.isArray(imgs) ? imgs.map((img, idx) => (
                                                                    <div key={idx} className="w-12 h-12 border rounded-sm overflow-hidden flex-shrink-0">
                                                                        <img src={`${API_BASE_URL}${img}`} alt="Review" className="w-full h-full object-cover" />
                                                                    </div>
                                                                )) : null;
                                                            } catch (e) { return null; }
                                                        })()}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                                                    <span className="font-medium text-gray-600">{review.user_name}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {visibleReviewsCount < reviews.length && (
                                            <div className="p-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => setVisibleReviewsCount(prev => prev + 3)}
                                                    className="w-full py-2 bg-white border border-gray-300 text-gray-800 font-semibold rounded-sm hover:shadow-md transition text-sm uppercase"
                                                >
                                                    Show {Math.min(3, reviews.length - visibleReviewsCount)} More Reviews
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-gray-500 text-sm">
                                        No reviews yet. Be the first to review this product!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rate Product Modal */}


                    </div>
                </div>

                {/* Recommendations Section */}
                <div className="mx-auto px-2 mt-10 space-y-8 max-w-full">
                    {similarProducts.length > 0 && (
                        <ProductRow
                            title="Similar Products"
                            products={similarProducts}
                            linkTo={`/${product?.category_slug || 'search'}/${product?.subcategory_slug || ''}/`}
                            section="similar_products"
                        />
                    )}

                    {interestedProducts.length > 0 && (
                        <ProductRow
                            title="You might also be interested in"
                            products={interestedProducts}
                            linkTo={`/${product?.category_slug || 'search'}/`}
                            section="interested_in"
                        />
                    )}

                    {recentProducts.length > 0 && (
                        <ProductRow
                            title="Recently Viewed"
                            products={recentProducts}
                            section="recently_viewed"
                        />
                    )}
                </div>

                {/* Hidden Treasure Modal */}
                {
                    foundTreasure && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-70 p-4 animate-in fade-in duration-300">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl scale-in-center">
                                {/* Background Sparkles */}
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>

                                <div className="mb-6 inline-block p-4 bg-yellow-100 rounded-full text-5xl">
                                    🎁
                                </div>

                                <h2 className="text-3xl font-black text-gray-900 mb-2">Treasure Found!</h2>
                                <p className="text-gray-600 mb-8 font-medium">You found a hidden hunt item. Here is your reward:</p>

                                <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 p-6 rounded-2xl mb-8 relative">
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                        Your Special Code
                                    </span>
                                    <div className="text-4xl font-black text-yellow-700 tracking-tighter mb-1">
                                        {foundTreasure.coupon}
                                    </div>
                                    <div className="text-xs font-bold text-yellow-600 uppercase">
                                        Valid for {foundTreasure.discount} on your next order
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(foundTreasure.coupon);
                                            toastSuccess("Coupon copied! Use it at checkout.");
                                            setFoundTreasure(null);
                                        }}
                                        className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-lg"
                                    >
                                        Copy Code & Continue
                                    </button>
                                    <button
                                        onClick={() => setFoundTreasure(null)}
                                        className="text-sm font-bold text-gray-400 hover:text-gray-600 transition"
                                    >
                                        Not Now
                                    </button>
                                </div>

                                {/* Confetti Particles Mock */}
                                <div className="absolute top-4 left-4 text-xl opacity-20 rotate-12">⭐</div>
                                <div className="absolute bottom-4 right-4 text-xl opacity-20 -rotate-12">⭐</div>
                                <div className="absolute top-1/2 left-0 text-xl opacity-20">✨</div>
                                <div className="absolute top-1/2 right-0 text-xl opacity-20">✨</div>
                            </div>
                        </div>
                    )
                }

                {/* Price History Modal */}
                {
                    showPriceModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative p-6 scale-in-center">
                                <button
                                    onClick={() => setShowPriceModal(false)}
                                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                                <PriceTracker
                                    productId={product.id}
                                    currentPrice={parsePrice(product.sale_price)}
                                />
                                <div className="mt-6">
                                    <button
                                        onClick={() => setShowPriceModal(false)}
                                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Seller Vibe Modal */}
                {
                    showVibeModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative p-6 scale-in-center">
                                <button
                                    onClick={() => setShowVibeModal(false)}
                                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                                <div className="mb-4 text-center">
                                    <h2 className="text-xl font-black text-gray-900">Seller Reliability</h2>
                                    <p className="text-xs text-gray-500 font-medium">Ratings for {product.shop_name}</p>
                                </div>
                                <SellerVibe
                                    shopId={product.shop_id}
                                    shopName={product.shop_name}
                                />
                                <div className="mt-2 text-[10px] text-gray-400 text-center leading-relaxed">
                                    This score is calculated from delivery and packaging ratings<br />provided by verified customers who bought this product.
                                </div>
                                <div className="mt-6">
                                    <button
                                        onClick={() => setShowVibeModal(false)}
                                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Group Deal Modal */}
                {
                    showGroupDealModal && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-transparent w-full max-w-md relative scale-in-center flex justify-center">
                                <div className="relative w-full">
                                    <button
                                        onClick={() => setShowGroupDealModal(false)}
                                        className="absolute -top-2 -right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors z-50 backdrop-blur-md border border-white/10"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                    <GroupBuyWidget
                                        productId={product.id}
                                        onJoinSuccess={() => {
                                            setShowGroupDealModal(false);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* T&C Modal */}
                {
                    showTCModal && activeTCContent && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTCModal(false)}>
                            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
                                    <h3 className="text-lg font-bold text-gray-900">Terms & Conditions</h3>
                                    <button
                                        onClick={() => setShowTCModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                                    <div className="prose prose-sm max-w-none">
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{activeTCContent}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Payment Options Modal */}
                {
                    showPaymentModal && paymentDetails && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                                {/* Modal Header */}
                                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xl font-bold text-gray-900">Payment Options</h3>
                                        {activePaymentTab && (
                                            <span className="text-blue-600 text-sm font-bold animate-pulse">
                                                {activePaymentTab} T&Cs
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="px-6 border-b border-gray-100 bg-white sticky top-[65px] z-10">
                                    <div className="flex gap-8 overflow-x-auto no-scrollbar">
                                        {Object.keys(paymentDetails).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setActivePaymentTab(tab);
                                                    const inst = Object.keys(paymentDetails[tab]);
                                                    if (inst.length > 0) setActiveInstitution(inst[0]);
                                                }}
                                                className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activePaymentTab === tab
                                                    ? "border-blue-600 text-blue-600"
                                                    : "border-transparent text-gray-500 hover:text-gray-900"
                                                    }`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Modal Content */}
                                <div className="flex flex-1 overflow-hidden">
                                    {/* Sidebar */}
                                    <div className="w-1/3 border-r border-gray-100 overflow-y-auto bg-gray-50/50">
                                        {activePaymentTab && typeof paymentDetails[activePaymentTab] === 'object' ? (
                                            <div className="p-2 space-y-1">
                                                {Object.keys(paymentDetails[activePaymentTab]).map((inst) => (
                                                    <button
                                                        key={inst}
                                                        onClick={() => setActiveInstitution(inst)}
                                                        className={`w-full text-left px-4 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${activeInstitution === inst
                                                            ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                                            : "text-gray-600 hover:bg-gray-100"
                                                            }`}
                                                    >
                                                        <span>{inst}</span>
                                                        <ChevronRight size={16} className={`transition-transform ${activeInstitution === inst ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-gray-400 italic text-sm">
                                                Detailed info not available for this tab.
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                                        {activePaymentTab && activeInstitution && typeof paymentDetails[activePaymentTab][activeInstitution] === 'object' && Array.isArray(paymentDetails[activePaymentTab][activeInstitution]) ? (
                                            <div className="animate-in fade-in slide-in-from-right duration-300">
                                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-8 border-l-4 border-blue-600 pl-4">
                                                    {activeInstitution} EMI PLANS
                                                </h4>
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-gray-400 text-left border-b border-gray-100">
                                                            <th className="pb-4 font-bold uppercase text-[10px] tracking-widest">Months</th>
                                                            <th className="pb-4 font-bold uppercase text-[10px] tracking-widest text-center">Monthly EMI</th>
                                                            <th className="pb-4 font-bold uppercase text-[10px] tracking-widest text-right">Overall Cost</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {paymentDetails[activePaymentTab][activeInstitution].map((plan, idx) => (
                                                            <tr key={idx} className="group hover:bg-blue-50/50 transition-colors">
                                                                <td className="py-5 font-bold text-gray-700">{plan.months}</td>
                                                                <td className="py-5 font-bold text-gray-900 text-center">{plan.monthlyEMI}</td>
                                                                <td className="py-5 font-bold text-gray-900 text-right">{plan.overallCost}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div className="mt-12 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                                                        * Final EMI and taxes will be calculated at checkout based on individual bank terms.
                                                        The rates shown above are indicative of the current bank offerings.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                                    <Info size={32} className="text-gray-300" />
                                                </div>
                                                <h4 className="font-bold text-gray-900 mb-2">Detailed Information</h4>
                                                <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                                                    {activePaymentTab && typeof paymentDetails[activePaymentTab] === 'string'
                                                        ? paymentDetails[activePaymentTab]
                                                        : "Select an institution from the sidebar to see detailed EMI plans and overall costs."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default ProductDetails;
