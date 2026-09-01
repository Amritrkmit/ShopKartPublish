import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toastError, axiosErrorMessage } from "../../utils/toast";
import { generateProductUrl } from "../../utils/productUrl";

import Pagination from "../../components/Pagination";
import SEO from "../../components/SEO";
import useWishlist from "../../hooks/useWishlist";
import MobileFilterHeader from "../../components/MobileFilterHeader";
import MobileSortDrawer from "../../components/MobileSortDrawer";
import MobileFilterDrawer from "../../components/MobileFilterDrawer";
import { Signal, Zap, IndianRupee } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Mock Data Generators for "Functionality" Demo where DB lacks columns
const OFFERS = ['Special Price', 'Buy More, Save More', 'No Cost EMI', 'Partner Offer'];

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("q") || "";
  const noSuggest = searchParams.get("nosuggest");
  const navigate = useNavigate();

  // Raw API Data
  const [allProducts, setAllProducts] = useState([]);
  // Filtered Data for Display
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [suggestedQuery, setSuggestedQuery] = useState("");
  const itemsPerPage = 60;

  // --- FILTERS STATE ---
  const [minPrice, setMinPrice] = useState(() => Number(searchParams.get("min") || 0));
  const [maxPrice, setMaxPrice] = useState(() => Number(searchParams.get("max") || 500000));
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "popularity");
  const [selectedBrands, setSelectedBrands] = useState(() => {
    const brands = searchParams.get("brands");
    return brands ? brands.split(",") : [];
  });
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [minRating, setMinRating] = useState(() => Number(searchParams.get("rating") || 0));
  const [selectedDiscounts, setSelectedDiscounts] = useState(() => {
    const discounts = searchParams.get("discounts");
    return discounts ? discounts.split(",").map(Number) : [];
  });
  const [selectedOffers, setSelectedOffers] = useState(() => {
    const offers = searchParams.get("offers");
    return offers ? offers.split(",") : [];
  });
  const [availability, setAvailability] = useState(() => searchParams.get("availability") === "true");
  const [selectedSizes, setSelectedSizes] = useState(() => {
    const sizes = searchParams.get("sizes");
    return sizes ? sizes.split(",") : [];
  });

  // NEW: Attribute Filters State
  const [attributes, setAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    const attrs = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith("attr_")) {
        const attrName = key.replace("attr_", "");
        attrs[attrName] = value.split(",");
      }
    }
    return attrs;
  });
  const [dominantCategoryId, setDominantCategoryId] = useState(null);

  // Cart & Wishlist
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  // Mobile Drawers
  const [isSortOpen, setSortOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('price');

  const parsePrice = (value) => Number(String(value).replace(/,/g, ""));

  const enrichProduct = React.useCallback((p) => {
    const randomSeed = p.id;
    const mockRating = (3.5 + (randomSeed % 15) / 10).toFixed(1);
    const mockDiscount = (randomSeed * 11) % 70;
    const mockOffers = OFFERS.filter((_, i) => (randomSeed + i) % 3 === 0);
    const hasGST = randomSeed % 2 === 0;

    return {
      ...p,
      brand: p.brand || "No Brand",
      rating: parseFloat(p.rating || mockRating),
      ratingCount: (randomSeed * 123) % 5000 + 50,
      discount: p.discount || mockDiscount,
      old_price: p.old_price || Math.round(p.price * (100 / (100 - mockDiscount))),
      offers: mockOffers,
      gstAvailable: hasGST
    };
  }, []);

  // Derive Brands from Search Results
  const dynamicBrands = useMemo(() => {
    const brandSet = new Set();
    allProducts.forEach(p => {
      if (p.brand && p.brand !== "No Brand") brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort().map((name, index) => ({ id: index, name }));
  }, [allProducts]);

  // Derive Sizes from Products
  const dynamicSizes = React.useMemo(() => {
    const sizeSet = new Set();
    allProducts.forEach(p => {
      const sizes = p.available_sizes;
      if (Array.isArray(sizes)) {
        sizes.forEach(s => sizeSet.add(s));
      } else if (typeof sizes === 'string' && sizes.trim() !== '') {
        try {
          JSON.parse(sizes).forEach(s => sizeSet.add(s));
        } catch (e) {
          sizes.split(',').forEach(s => sizeSet.add(s.trim()));
        }
      }
    });
    return Array.from(sizeSet).sort();
  }, [allProducts]);

  // --- DOMINANT CATEGORY LOGIC ---
  useEffect(() => {
    if (allProducts.length === 0) {
      setDominantCategoryId(null);
      setAttributes([]);
      return;
    }

    const catCounts = {};
    let maxCount = 0;
    let maxCatId = null;

    allProducts.forEach(p => {
      if (p.category_id) {
        catCounts[p.category_id] = (catCounts[p.category_id] || 0) + 1;
        if (catCounts[p.category_id] > maxCount) {
          maxCount = catCounts[p.category_id];
          maxCatId = p.category_id;
        }
      }
    });

    setDominantCategoryId(prev => (maxCatId !== prev ? maxCatId : prev));
  }, [allProducts]);

  // --- FETCH ATTRIBUTES ---
  useEffect(() => {
    if (!dominantCategoryId) return;

    // Don't fetch if we already have attributes for this category to avoid loops
    // But since we don't store which category attributes belong to in state, we just fetch.
    // Optimization: check if attributes list is empty or if category changed.

    axios.get(`${API_BASE_URL}/api/attributes?category_id=${dominantCategoryId}`)
      .then(res => setAttributes(res.data || []))
      .catch(err => console.error("Failed to fetch attributes", err));
  }, [dominantCategoryId]);

  // --- URL SYNC ---
  useEffect(() => {
    const params = { q: searchTerm };
    if (noSuggest) params.nosuggest = noSuggest;

    if (minPrice > 0) params.min = minPrice;
    if (maxPrice < 500000) params.max = maxPrice;
    if (sortBy !== "popularity") params.sort = sortBy;
    if (selectedBrands.length > 0) params.brands = selectedBrands.join(",");
    if (minRating > 0) params.rating = minRating;
    if (selectedDiscounts.length > 0) params.discounts = selectedDiscounts.join(",");
    if (selectedOffers.length > 0) params.offers = selectedOffers.join(",");
    if (selectedSizes.length > 0) params.sizes = selectedSizes.join(",");
    if (availability) params.availability = "true";

    // Attributes
    Object.keys(selectedAttributes).forEach(key => {
      if (selectedAttributes[key] && selectedAttributes[key].length > 0) {
        params[`attr_${key}`] = selectedAttributes[key].join(",");
      }
    });

    setSearchParams(params, { replace: true });
  }, [minPrice, maxPrice, sortBy, selectedBrands, minRating, selectedDiscounts, selectedOffers, availability, selectedSizes, selectedAttributes, setSearchParams, searchTerm, noSuggest]);

  // --- FETCHING ---

  // Fetch Products based on search
  useEffect(() => {
    const fetchProducts = async () => {
      if (!searchTerm) {
        setAllProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const url = `${API_BASE_URL}/products?search=${searchTerm}&limit=500`;
        let res = await axios.get(url);
        let rawData = [];
        let finalSuggested = "";

        if (res.data.products) {
          rawData = res.data.products;
          finalSuggested = res.data.suggestedQuery || "";
        } else if (Array.isArray(res.data)) {
          rawData = res.data;
        }

        // AUTO-FALLBACK: If 0 results and we have a suggestion, fetch results for that suggestion
        if (rawData.length === 0 && finalSuggested && !noSuggest) {
          const fallbackUrl = `${API_BASE_URL}/products?search=${encodeURIComponent(finalSuggested)}&limit=500&nosuggest=true`;
          const fallbackRes = await axios.get(fallbackUrl);
          const fallbackData = fallbackRes.data.products || (Array.isArray(fallbackRes.data) ? fallbackRes.data : []);

          if (fallbackData.length > 0) {
            rawData = fallbackData;
            setSuggestedQuery(finalSuggested);
          } else {
            setSuggestedQuery("");
          }
        } else {
          setSuggestedQuery("");
        }

        const enriched = rawData.map(enrichProduct);
        setAllProducts(enriched);
      } catch (err) {
        toastError(axiosErrorMessage(err, "Failed to fetch search results"));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchTerm, enrichProduct, noSuggest]);

  // --- FILTERING LOGIC ---
  useEffect(() => {
    const isInitialLoad = allProducts.length > 0 && products.length === 0;
    const delay = isInitialLoad ? 30 : 150; // Snappier delay

    if (!isInitialLoad) setFilterLoading(true);

    const filterTimeout = setTimeout(() => {
      let result = [...allProducts];

      // 1. Price
      result = result.filter(p => {
        const price = parseFloat(p.price) || 0;
        return price >= minPrice && price <= maxPrice;
      });

      // 2. Brand
      if (selectedBrands.length > 0) {
        result = result.filter(p => selectedBrands.includes(p.brand));
      }

      // 3. Rating
      if (minRating > 0) {
        result = result.filter(p => p.rating >= minRating);
      }

      // 4. Discount
      if (selectedDiscounts.length > 0) {
        result = result.filter(p => selectedDiscounts.some(d => p.discount >= d));
      }

      // 5. Offers
      if (selectedOffers.length > 0) {
        result = result.filter(p => selectedOffers.some(o => p.offers.includes(o)));
      }

      // 6. Availability (GST)
      if (availability) {
        result = result.filter(p => p.gstAvailable);
      }

      // 7. Sizes
      if (selectedSizes.length > 0) {
        result = result.filter(p => {
          let pSizes = p.available_sizes || [];
          if (typeof pSizes === 'string') {
            try {
              pSizes = JSON.parse(pSizes);
              if (!Array.isArray(pSizes)) pSizes = [];
            } catch (e) {
              // Fallback for comma-separated
              pSizes = pSizes.split(',').map(s => s.trim());
            }
          }
          if (!Array.isArray(pSizes)) return false;
          return selectedSizes.some(s => pSizes.includes(s));
        });
      }

      // 8. Attributes
      if (Object.keys(selectedAttributes).length > 0) {
        result = result.filter(p => {
          return Object.keys(selectedAttributes).every(attrName => {
            const selectedValues = selectedAttributes[attrName];
            if (!selectedValues || selectedValues.length === 0) return true;

            const productAttrs = p.attributes;
            if (!productAttrs) return false;

            let attrs = {};
            try {
              attrs = typeof productAttrs === 'string' ? JSON.parse(productAttrs) : productAttrs;
            } catch (e) {
              return false;
            }

            const productValue = attrs[attrName];
            if (!productValue) return false;

            if (Array.isArray(productValue)) {
              return productValue.some(val => selectedValues.includes(val));
            }

            return selectedValues.includes(productValue);
          });
        });
      }

      // 7. Sort
      if (sortBy === 'price -- low to high') {
        result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      } else if (sortBy === 'price -- high to low') {
        result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      } else if (sortBy === 'newest first') {
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else {
        // popularity
        result.sort((a, b) => b.ratingCount - a.ratingCount);
      }

      setTotalFilteredCount(result.length);
      setTotalPages(Math.ceil(result.length / itemsPerPage));
      const paginated = result.slice((page - 1) * itemsPerPage, page * itemsPerPage);

      setProducts(paginated);
      setFilterLoading(false);
    }, delay);

    return () => clearTimeout(filterTimeout);
  }, [allProducts, page, minPrice, maxPrice, sortBy, selectedBrands, minRating, selectedDiscounts, selectedOffers, availability, products.length, selectedSizes, selectedAttributes]);


  // --- HANDLERS ---
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleBrand = (brand) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
    setPage(1);
  };

  const toggleDiscount = (val) => {
    setSelectedDiscounts(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]);
    setPage(1);
  };

  const toggleOffer = (offer) => {
    setSelectedOffers(prev => prev.includes(offer) ? prev.filter(o => o !== offer) : [...prev, offer]);
    setPage(1);
  };

  const toggleWishlist = (e, productId) => {
    e.stopPropagation();
    if (wishlist.includes(productId)) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }
  };

  return (
    <div className="bg-[#f1f3f6] min-h-screen pt-4 pb-4">
      <SEO
        title={`Search results for "${searchTerm}"`}
        description={`Find the best deals for "${searchTerm}" on Shopkart.`}
      />
      <div className="mx-auto px-0 md:px-2 flex flex-col md:flex-row gap-4">
        {/* Mobile Filter Header */}
        <MobileFilterHeader
          onSortClick={() => setSortOpen(true)}
          onFilterClick={() => setFilterOpen(true)}
          activeSort={sortBy}
          quickFilters={[
            {
              label: '5G',
              isActive: selectedBrands.includes('5G') || searchTerm.toLowerCase().includes('5g'),
              icon: <Signal size={14} className="text-blue-600" />,
              onClick: () => {
                if (!searchTerm.toLowerCase().includes('5g')) {
                  navigate(`/search/?q=${searchTerm} 5G`);
                }
              }
            },
            {
              label: '₹20000 - ₹30000',
              isActive: minPrice === 20000 && maxPrice === 30000,
              icon: <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center"><IndianRupee size={10} className="text-green-700" /></div>,
              onClick: () => {
                if (minPrice === 20000 && maxPrice === 30000) {
                  setMinPrice(0);
                  setMaxPrice(500000);
                } else {
                  setMinPrice(20000);
                  setMaxPrice(30000);
                }
                setPage(1);
              }
            },
            {
              label: 'New Launches',
              isActive: sortBy === 'newest first',
              icon: <Zap size={14} className="text-blue-500" />,
              onClick: () => {
                setSortBy(prev => prev === 'newest first' ? 'popularity' : 'newest first');
                setPage(1);
              }
            }
          ]}
        />

        {/* Mobile Sort Drawer */}
        <MobileSortDrawer
          isOpen={isSortOpen}
          onClose={() => setSortOpen(false)}
          activeSort={sortBy}
          onSortChange={(val) => {
            setSortBy(val);
            setPage(1);
          }}
        />

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => setPage(1)}
          onClearAll={() => {
            setSelectedBrands([]);
            setMinPrice(0);
            setMaxPrice(500000);
            setMinRating(0);
            setSelectedDiscounts([]);
            setSelectedOffers([]);
            setAvailability(false);
          }}
          activeTab={activeFilterTab}
          setActiveTab={setActiveFilterTab}
          tabs={[
            { id: 'price', label: 'Price' },
            { id: 'brand', label: 'Brand' },
            { id: 'rating', label: 'Rating' },
            { id: 'discount', label: 'Discount' },
            { id: 'offers', label: 'Offers' },
            { id: 'availability', label: 'Availability' },
          ]}
          renderContent={() => (
            <div className="space-y-4">
              {activeFilterTab === 'price' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-gray-800">Select Price Range</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500 font-medium uppercase">Min Price</label>
                      <select
                        className="w-full border p-2  bg-gray-50 text-[14px]"
                        value={minPrice}
                        onChange={(e) => setMinPrice(Number(e.target.value))}
                      >
                        <option value="0">Min</option>
                        {[500, 1000, 5000, 10000, 20000, 50000].map(v => <option key={v} value={v}>₹{v}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-500 font-medium uppercase">Max Price</label>
                      <select
                        className="w-full border p-2 bg-gray-50 text-[14px]"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                      >
                        {[5000, 10000, 30000, 50000, 100000, 200000, 500000].map(v => <option key={v} value={v}>₹{v}{v === 500000 ? '+' : ''}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeFilterTab === 'brand' && (
                <div className="space-y-1">
                  {dynamicBrands.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b.name)}
                        onChange={() => toggleBrand(b.name)}
                        className="w-5 h-5 text-brand-orange border-gray-300 rounded focus:ring-0"
                      />
                      <span className={`text-[15px] ${selectedBrands.includes(b.name) ? 'text-brand-orange font-medium' : 'text-gray-700'}`}>
                        {b.name}
                      </span>
                    </label>
                  ))}
                  {dynamicBrands.length === 0 && <p className="text-xs text-gray-400 italic">No brands available</p>}
                </div>
              )}

              {activeFilterTab === 'rating' && (
                <div className="space-y-1">
                  {[4, 3, 2, 1].map((r) => (
                    <label key={r} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={minRating === r}
                        onChange={() => setMinRating(prev => prev === r ? 0 : r)}
                        className="w-5 h-5 text-brand-orange rounded focus:ring-0"
                      />
                      <span className="text-[15px] text-gray-700 font-medium">{r} ★ & above</span>
                    </label>
                  ))}
                </div>
              )}

              {activeFilterTab === 'discount' && (
                <div className="space-y-1">
                  {[50, 40, 30, 20, 10].map((d) => (
                    <label key={d} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDiscounts.includes(d)}
                        onChange={() => toggleDiscount(d)}
                        className="w-5 h-5 text-brand-orange rounded focus:ring-0"
                      />
                      <span className="text-[15px] text-gray-700 font-medium">{d}% or more</span>
                    </label>
                  ))}
                </div>
              )}

              {activeFilterTab === 'offers' && (
                <div className="space-y-1">
                  {['Special Price', 'Buy More, Save More'].map((o) => (
                    <label key={o} className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOffers.includes(o)}
                        onChange={() => toggleOffer(o)}
                        className="w-5 h-5 text-brand-orange rounded focus:ring-0"
                      />
                      <span className="text-[15px] text-gray-700 font-medium">{o}</span>
                    </label>
                  ))}
                </div>
              )}

              {activeFilterTab === 'availability' && (
                <label className="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availability}
                    onChange={() => setAvailability(!availability)}
                    className="w-5 h-5 text-brand-orange rounded focus:ring-0"
                  />
                  <span className="text-[15px] text-gray-700 font-medium">GST Invoice Available</span>
                </label>
              )}
            </div>
          )}
        />

        {/* --- Sidebar Filters (Desktop) --- */}
        <div className="w-[280px] hidden md:block bg-white shadow-sm rounded-sm self-start sticky top-[70px] overflow-y-auto max-h-[calc(100vh-80px)] no-scrollbar">
          <div className="p-4 border-b">
            <h3 className="text-lg font-bold text-gray-800">Filters</h3>
            {(selectedBrands.length > 0 || minPrice > 0 || minRating > 0 || selectedSizes.length > 0 || Object.keys(selectedAttributes).length > 0) && (
              <button
                onClick={() => {
                  setSelectedBrands([]);
                  setMinPrice(0);
                  setMaxPrice(500000);
                  setMinRating(0);
                  setSelectedDiscounts([]);
                  setSelectedOffers([]);
                  setAvailability(false);
                  setSelectedSizes([]);
                  setSelectedAttributes({});
                }}
                className="text-xs font-bold text-[#dc3545] uppercase mt-1 float-right"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Price Filter */}
          <div className="p-4 border-b">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Price</h4>
            <div className="relative h-6 mb-4">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2">
                <div
                  className="absolute h-full bg-[#dc3545] rounded-full"
                  style={{
                    left: `${(minPrice / 500000) * 100}%`,
                    width: `${((maxPrice - minPrice) / 500000) * 100}%`
                  }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={minPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val < maxPrice) {
                    setMinPrice(val);
                    setPage(1);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: minPrice > maxPrice - 10000 ? 5 : 3 }}
              />
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={maxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > minPrice) {
                    setMaxPrice(val);
                    setPage(1);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: 4 }}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <select
                className="flex-1 border border-gray-200 p-2 rounded text-sm focus:border-blue-500 outline-none bg-white"
                value={minPrice}
                onChange={e => { setMinPrice(Number(e.target.value)); setPage(1); }}
              >
                <option value="0">Min</option>
                <option value="500">₹500</option>
                <option value="1000">₹1000</option>
                <option value="2000">₹2000</option>
                <option value="5000">₹5000</option>
                <option value="10000">₹10000</option>
                <option value="15000">₹15000</option>
                <option value="20000">₹20000</option>
                <option value="25000">₹25000</option>
                <option value="30000">₹30000</option>
                <option value="50000">₹50000</option>
                <option value="100000">₹1L</option>
                <option value="200000">₹2L</option>
                <option value="500000">₹5L</option>
              </select>
              <span className="text-gray-400 text-xs">to</span>
              <select
                className="flex-1 border border-gray-200 p-2 rounded text-sm focus:border-blue-500 outline-none bg-white"
                value={maxPrice}
                onChange={e => { setMaxPrice(Number(e.target.value)); setPage(1); }}
              >
                <option value="5000">₹5000</option>
                <option value="10000">₹10000</option>
                <option value="15000">₹15000</option>
                <option value="20000">₹20000</option>
                <option value="25000">₹25000</option>
                <option value="30000">₹30000</option>
                <option value="50000">₹50000</option>
                <option value="100000">₹1L</option>
                <option value="200000">₹2L</option>
                <option value="500000">₹5L+</option>
              </select>
            </div>
          </div>

          {/* Brand Filter */}
          <div className="p-4 border-b">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Brand</h4>
            <div className="relative mb-3 group">
              <input
                type="text"
                placeholder="Search Brand"
                value={brandSearchTerm}
                onChange={(e) => setBrandSearchTerm(e.target.value)}
                className="w-full text-xs border-b border-gray-200 py-1 focus:border-[#dc3545] outline-none transition-colors pr-6"
              />
              <svg className="absolute right-0 top-1.5 w-3.5 h-3.5 text-gray-400 group-focus-within:text-[#dc3545]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {dynamicBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).map(b => (
                <label key={b.id} className="flex items-center gap-2 cursor-pointer mb-2 group">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.name)}
                    onChange={() => toggleBrand(b.name)}
                    className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <span className={`text-sm transition-colors ${selectedBrands.includes(b.name) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{b.name}</span>
                </label>
              ))}
              {dynamicBrands.length === 0 && <p className="text-xs text-gray-400 italic">No brands available</p>}
              {dynamicBrands.length > 0 && dynamicBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).length === 0 && (
                <p className="text-xs text-gray-400 italic">No matching brands</p>
              )}
            </div>
          </div>

          {/* Size Filter */}
          {dynamicSizes.length > 0 && (
            <div className="p-4 border-b">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Size</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {dynamicSizes.map((size) => (
                  <label key={size} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSizes.includes(size)}
                      onChange={() => {
                        setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
                        setPage(1);
                      }}
                      className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                    />
                    <span className={`text-sm transition-colors ${selectedSizes.includes(size) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{size}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Attribute Filters */}
          {attributes.map((attr) => (
            <div key={attr.id} className="p-4 border-b">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">
                {attr.name}
                {attr.required && <span className="text-red-500 ml-1">*</span>}
              </h4>

              {attr.input_type === 'checkbox' && attr.options && attr.options.length > 0 ? (
                <div className="space-y-2">
                  {attr.options.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAttributes[attr.name]?.includes(option) || false}
                        onChange={() => {
                          setSelectedAttributes(prev => {
                            const current = prev[attr.name] || [];
                            if (current.includes(option)) {
                              const updated = current.filter(v => v !== option);
                              if (updated.length === 0) {
                                const newState = { ...prev };
                                delete newState[attr.name];
                                return newState;
                              }
                              return { ...prev, [attr.name]: updated };
                            } else {
                              return { ...prev, [attr.name]: [...current, option] };
                            }
                          });
                          setPage(1);
                        }}
                        className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              ) : attr.input_type === 'select' && attr.options && attr.options.length > 0 ? (
                <select
                  value={selectedAttributes[attr.name]?.[0] || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedAttributes(prev => ({ ...prev, [attr.name]: [e.target.value] }));
                    } else {
                      setSelectedAttributes(prev => {
                        const newState = { ...prev };
                        delete newState[attr.name];
                        return newState;
                      });
                    }
                    setPage(1);
                  }}
                  className="w-full border border-gray-200 p-2 rounded text-sm focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">All {attr.name}</option>
                  {attr.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}

          {/* Customer Ratings */}
          <div className="p-4 border-b">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Customer Ratings</h4>
            <div className="space-y-2">
              {[4, 3, 2, 1].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={minRating === r}
                    onChange={() => setMinRating(prev => prev === r ? 0 : r)}
                    className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                  />
                  <span className="text-sm text-gray-700 flex items-center">{r}★ & above</span>
                </label>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div className="p-4 border-b">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Discount</h4>
            <div className="space-y-2">
              {[50, 40, 30, 20, 10].map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDiscounts.includes(d)}
                    onChange={() => toggleDiscount(d)}
                    className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                  />
                  <span className="text-sm text-gray-700">{d}% or more</span>
                </label>
              ))}
            </div>
          </div>

          {/* Offers */}
          <div className="p-4 border-b">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Offers</h4>
            <div className="space-y-2">
              {['Special Price', 'Buy More, Save More'].map(o => (
                <label key={o} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOffers.includes(o)}
                    onChange={() => toggleOffer(o)}
                    className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                  />
                  <span className="text-sm text-gray-700">{o}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Availability</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availability}
                onChange={() => setAvailability(!availability)}
                className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
              />
              <span className="text-sm text-gray-700">GST Invoice Available</span>
            </label>
          </div>

        </div>

        {/* --- Main Content --- */}
        <div className="flex-1">
          {/* Breadcrumb & Sort Bar */}
          <div className="bg-white shadow-sm rounded-sm p-4 mb-2 flex flex-col justify-between">
            <div className="text-xs text-gray-500 mb-2">
              Home {searchTerm ? `/ Search Results / ${searchTerm}` : '/ All Products'}
              <h1 className="text-[16px] text-gray-900 mt-1 flex flex-wrap items-baseline gap-x-1">
                {suggestedQuery ? (
                  <>
                    <span className="font-medium text-gray-600">Showing {(page - 1) * itemsPerPage + 1} – {Math.min(page * itemsPerPage, totalFilteredCount)} of {totalFilteredCount} results for</span>
                    <span className="font-bold italic text-gray-900">"{suggestedQuery}"</span>
                    <button
                      onClick={() => navigate(`/search/?q=${encodeURIComponent(searchTerm)}&nosuggest=true`)}
                      className="text-blue-600 hover:underline text-[14px] ml-4"
                    >
                      Show results for <span className="italic">{searchTerm}</span> instead
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-gray-800">{searchTerm ? `Results for "${searchTerm}"` : "All Products"}</span>
                    <span className="text-[12px] font-normal text-gray-400 ml-2">
                      (Showing {(page - 1) * itemsPerPage + 1} – {Math.min(page * itemsPerPage, totalFilteredCount)} products of {totalFilteredCount} products)
                    </span>
                  </>
                )}
              </h1>
            </div>
            <div className="hidden md:flex gap-4 text-sm font-medium text-gray-700">
              <span className="font-bold">Sort By</span>
              {['Popularity', 'Price -- Low to High', 'Price -- High to Low', 'Newest First'].map(s => (
                <button
                  key={s}
                  className={`pb-1 border-b-2 transition ${sortBy === s.toLowerCase() ? 'text-[#dc3545] border-[#dc3545]' : 'border-transparent hover:text-[#dc3545]'}`}
                  onClick={() => setSortBy(s.toLowerCase())}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="bg-white shadow-sm rounded-sm min-h-[400px]">
            {(loading || filterLoading) ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-[#dc3545] rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {loading ? 'Searching products...' : 'Applying filters...'}
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <div className="text-gray-400 text-5xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No products found for "{searchTerm}"</h3>
                <button
                  onClick={() => {
                    setSelectedBrands([]);
                    setMinPrice(0);
                    setMaxPrice(500000);
                    setMinRating(0);
                    setSelectedDiscounts([]);
                    setSelectedOffers([]);
                    setAvailability(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divider-gray-200 border-b border-gray-200 sm:divide-y-0 sm:divide-x sm:gap-0">
                {products.map((product) => {
                  const isWishlisted = wishlist.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className="p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer group flex flex-col relative"
                      onClick={() => navigate(generateProductUrl(product, null, null, { otracker: 'search', otracker1: 'search' }))}
                    >
                      {/* Compare Toggle */}
                      {/* <div
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 cursor-pointer hover:bg-white transition-all">
                          <input
                            type="checkbox"
                            checked={compareList.includes(product.id)}
                            onChange={() => toggleCompare(product.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Compare</span>
                        </label>
                      </div> */}

                      {/* Wishlist Icon */}
                      <button
                        onClick={(e) => toggleWishlist(e, product.id)}
                        className="absolute top-2 right-2 z-10"
                      >
                        <div className={`w-8 h-8 md:w-9 md:h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center border border-gray-100 transition-all hover:scale-110 ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 md:h-5 md:w-5 ${isWishlisted ? "fill-current" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </button>

                      <div className="h-48 w-full flex items-center justify-center p-2 mb-4 relative">
                        <img
                          src={`${API_BASE_URL}${product.image}`}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <h3 className="text-sm font-medium text-gray-800 hover:text-[#dc3545] line-clamp-2 mb-1">
                          {product.name}
                        </h3>
                        {/* Rating Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            {product.rating} ★
                          </div>
                          <span className="text-xs text-gray-500 font-medium">({product.ratingCount})</span>
                          {product.gstAvailable && <span className="text-[10px] text-gray-400 border border-gray-300 px-1 rounded">GST</span>}
                        </div>

                        <div className="mt-auto pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-base sm:text-lg font-bold text-gray-900">₹{parsePrice(product.sale_price || product.price).toLocaleString("en-IN")}</span>
                            {(product.discount > 0 || (product.sale_price && product.sale_price < product.price)) && (
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] text-gray-400 !line-through">₹{parsePrice(product.price).toLocaleString("en-IN")}</span>
                                <span className="text-[12px] text-green-600 font-bold whitespace-nowrap">
                                  {Math.round(((parsePrice(product.price) - parsePrice(product.sale_price || product.price)) / parsePrice(product.price)) * 100)}% off
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-[11px] text-black font-medium">Free delivery</div>
                            {product.offers && product.offers.length > 0 && (
                              <div className="text-[10px] text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                                {product.offers[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
