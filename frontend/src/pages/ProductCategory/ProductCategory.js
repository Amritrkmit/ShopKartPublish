import { useEffect, useState } from "react";
import axios from "axios";

import ProductCard from "../../components/ProductCard";
import Pagination from "../../components/Pagination";


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProductGrid = ({ searchTerm, sortBy, tags, onResultsUpdate, hideHeader = false }) => {
  // 🔹 Sidebar Filter State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [brands, setBrands] = useState([]);
  const [attributes, setAttributes] = useState([]); // Product attributes for filtering
  const [selectedAttributes, setSelectedAttributes] = useState({}); // {attributeName: [selectedValues]}
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const [loading, setLoading] = useState(false);
  localStorage.getItem("userToken");

  // Fetch products & categories
  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/products`)
      .then((res) => {
        // Handle both simple array and paginated object response
        const productList = Array.isArray(res.data) ? res.data : (res.data.products || []);
        setProducts(productList);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setProducts([]); // Fallback to empty array
        setLoading(false);
      });

    axios
      .get(`${API_BASE_URL}/category`)
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      axios
        .get(`${API_BASE_URL}/subcategory/${selectedCategory}`)
        .then((res) => setSubcategories(res.data))
        .catch((err) => console.error("Error fetching subcategories:", err));
    } else {
      setSubcategories([]);
      setSelectedSubcategory("");
      setSelectedBrands([]); // Reset brands on category change
    }
  }, [selectedCategory]);

  // Fetch dynamic brands when category or subcategory changes
  useEffect(() => {
    let url = `${API_BASE_URL}/api/brands`;
    if (selectedSubcategory) {
      url += `?subcategory_id=${selectedSubcategory}`;
    } else if (selectedCategory) {
      url += `?category_id=${selectedCategory}`;
    }

    axios
      .get(url)
      .then((res) => setBrands(res.data))
      .catch((err) => console.error("Error fetching brands:", err));
  }, [selectedCategory, selectedSubcategory]);

  // Fetch attributes when category or subcategory changes
  useEffect(() => {
    if (!selectedCategory) {
      setAttributes([]);
      setSelectedAttributes({});
      return;
    }

    let url = `${API_BASE_URL}/api/attributes?category_id=${selectedCategory}`;
    if (selectedSubcategory) {
      url += `&subcategory_id=${selectedSubcategory}`;
    }

    axios
      .get(url)
      .then((res) => {
        setAttributes(res.data || []);
        setSelectedAttributes({}); // Reset selected attributes
      })
      .catch((err) => console.error("Error fetching attributes:", err));
  }, [selectedCategory, selectedSubcategory]);

  // 🔹 Filtering & Sorting logic

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name || "")
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase());

    const matchesCategory = selectedCategory
      ? (String(product.category_id) === String(selectedCategory))
      : true;

    const matchesSubcategory = selectedSubcategory
      ? (String(product.subcategory_id) === String(selectedSubcategory))
      : true;

    const matchesBrand = selectedBrands.length > 0
      ? (selectedBrands.includes(product.brand))
      : true;

    // Match attributes
    const matchesAttributes = Object.keys(selectedAttributes).every(attrName => {
      const selectedValues = selectedAttributes[attrName];
      if (!selectedValues || selectedValues.length === 0) return true;

      // Check if product has this attribute and if its value matches any selected value
      const productAttrs = product.attributes;
      if (!productAttrs) return false;

      // Parse if string
      const attrs = typeof productAttrs === 'string' ? JSON.parse(productAttrs) : productAttrs;
      const productValue = attrs[attrName];

      if (!productValue) return false;

      // Handle array values (for checkbox attributes)
      if (Array.isArray(productValue)) {
        return productValue.some(val => selectedValues.includes(val));
      }

      // Handle single value
      return selectedValues.includes(productValue);
    });

    const matchesPrice =
      product.price >= priceRange[0] && product.price <= priceRange[1];

    const matchesTags = tags
      ? (product.tags && product.tags.includes(tags))
      : true;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesBrand && matchesAttributes && matchesPrice && matchesTags;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return b.id - a.id; // Assume higher ID = newer
    }
    if (sortBy === "best_selling") {
      // Mock: use price or just keep original order but maybe reverse? 
      // For now using ID ascending as "Best Sellers"
      return a.id - b.id;
    }
    if (sortBy === "trending") {
      // Mock: Sort by Price Desc as 'Trending'
      return b.price - a.price;
    }
    return 0;
  });

  // Calculate Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedSubcategory, selectedBrands, selectedAttributes, priceRange, searchTerm, tags]);

  // Notify parent of total results
  useEffect(() => {
    if (onResultsUpdate) {
      onResultsUpdate(filteredProducts.length, page, itemsPerPage);
    }
  }, [filteredProducts.length, page, onResultsUpdate]);


  return (
    <section className="py-10 bg-gray-50 min-h-screen">
      {!hideHeader && <h2 className="text-2xl font-bold mb-6 text-center">Featured Products</h2>}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 🔹 Sidebar Filters */}
        <aside className="md:col-span-3 bg-white rounded-xl shadow p-5 h-fit sticky top-20">
          <h3 className="text-lg font-semibold mb-5">Filters</h3>

          {/* Category Filter */}
          <div className="mb-6 pb-5 border-b border-gray-100">
            <label className="block text-sm font-semibold text-gray-800 mb-2">CATEGORY</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory(""); // Reset subcategory on category change
                setSelectedBrands([]); // Reset brands on category change
              }}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {selectedCategory && subcategories.length > 0 && (
            <div className="mb-6 pb-5 border-b border-gray-100">
              <label className="block text-sm font-semibold text-gray-800 mb-2">SUBCATEGORY</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => {
                  setSelectedSubcategory(e.target.value);
                  setSelectedBrands([]); // Reset brands on subcategory change
                }}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Brand Filter */}
          <div className="mb-6 pb-5 border-b border-gray-100">
            <label className="block text-sm font-semibold text-gray-800 mb-2">BRAND</label>
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search Brand"
                value={brandSearchTerm}
                onChange={(e) => setBrandSearchTerm(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-2">
              {brands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).map((brand) => (
                <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.name)}
                    onChange={() => {
                      if (selectedBrands.includes(brand.name)) {
                        setSelectedBrands(prev => prev.filter(b => b !== brand.name));
                      } else {
                        setSelectedBrands(prev => [...prev, brand.name]);
                      }
                    }}
                    className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className={`text-sm ${selectedBrands.includes(brand.name) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>{brand.name}</span>
                </label>
              ))}
              {brands.length === 0 && <p className="text-xs text-gray-400 italic">No brands found</p>}
              {brands.length > 0 && brands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).length === 0 && (
                <p className="text-xs text-gray-400 italic">No matching brands</p>
              )}
            </div>
          </div>

          {/* Attribute Filters */}
          {attributes.length > 0 && (
            <div className="mb-6 pb-5 border-b border-gray-100">
              <label className="block text-sm font-semibold text-gray-800 mb-3">FILTERS</label>
              <div className="space-y-4">
                {attributes.map((attr) => (
                  <div key={attr.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700 uppercase">
                        {attr.name}
                        {attr.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>

                    {attr.input_type === 'checkbox' && attr.options && attr.options.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {attr.options.map((option) => (
                          <label key={option} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedAttributes[attr.name]?.includes(option) || false}
                              onChange={() => {
                                setSelectedAttributes(prev => {
                                  const current = prev[attr.name] || [];
                                  if (current.includes(option)) {
                                    // Remove
                                    const updated = current.filter(v => v !== option);
                                    if (updated.length === 0) {
                                      const newState = { ...prev };
                                      delete newState[attr.name];
                                      return newState;
                                    }
                                    return { ...prev, [attr.name]: updated };
                                  } else {
                                    // Add
                                    return { ...prev, [attr.name]: [...current, option] };
                                  }
                                });
                              }}
                              className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500"
                            />
                            <span className={`text-sm ${selectedAttributes[attr.name]?.includes(option) ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                              {option}
                            </span>
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
                        }}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="">All {attr.name}</option>
                        {attr.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price Range Filter */}
          <div className="mb-6 pb-5 border-b border-gray-100">
            <label className="block text-sm font-semibold text-gray-800 mb-4">PRICE</label>

            {/* Dual Range Slider */}
            <div className="relative h-6 mb-4">
              {/* Track Background */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2">
                {/* Active Track (blue portion) */}
                <div
                  className="absolute h-full bg-[#dc3545] rounded-full"
                  style={{
                    left: `${(priceRange[0] / 500000) * 100}%`,
                    width: `${((priceRange[1] - priceRange[0]) / 500000) * 100}%`
                  }}
                />
              </div>

              {/* Min Slider */}
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={priceRange[0]}
                onChange={(e) => {
                  const val = +e.target.value;
                  if (val < priceRange[1]) {
                    setPriceRange([val, priceRange[1]]);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: priceRange[0] > priceRange[1] - 10000 ? 5 : 3 }}
              />

              {/* Max Slider */}
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={priceRange[1]}
                onChange={(e) => {
                  const val = +e.target.value;
                  if (val > priceRange[0]) {
                    setPriceRange([priceRange[0], val]);
                  }
                }}
                className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                style={{ zIndex: 4 }}
              />
            </div>

            {/* Min/Max Dropdowns */}
            <div className="flex items-center gap-3">
              <select
                value={priceRange[0]}
                onChange={(e) => {
                  const val = +e.target.value;
                  if (val < priceRange[1]) {
                    setPriceRange([val, priceRange[1]]);
                  }
                }}
                className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
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

              <span className="text-gray-400 text-sm">to</span>

              <select
                value={priceRange[1]}
                onChange={(e) => {
                  const val = +e.target.value;
                  if (val > priceRange[0]) {
                    setPriceRange([priceRange[0], val]);
                  }
                }}
                className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
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

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSelectedCategory("");
              setSelectedSubcategory("");
              setSelectedBrands([]);
              setSelectedAttributes({});
              setPriceRange([0, 500000]);
            }}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg w-full hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Clear All Filters
          </button>
        </aside>

        {/* 🔹 Product Grid */}
        <div className="md:col-span-9">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                section="category_browse"
              />
            ))}

            {displayedProducts.length === 0 && !loading && (
              <p className="col-span-full text-center text-gray-500 mt-6">
                No products found.
              </p>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
