import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import { useConfirmation } from "../../context/ConfirmationContext";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Upload, X, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Trash2, Layers, Type, Calendar, Image as ImageIcon, FileText, Settings2, Wand2 } from "lucide-react";
import InventorySection from "../components/InventorySection";
import FeatureManager from "../components/FeatureManager";
import { decryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function ProductUpload() {
  const { id } = useParams();
  // Decrypt ID
  const decryptedId = decryptId(id) || id;

  const navigate = useNavigate();
  const isEditMode = !!id;
  const { confirm } = useConfirmation();

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    price: "",
    sale_price: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    brand: "",
    status: "draft", // draft or published
    available_sizes: [],
    size_chart: "",
    sku: "",
    barcode: "",
    track_inventory: false,
    stock: 0,
    stock_status: "in_stock",
    weight: "",
    dimensions: "",
    shipping_class: "standard",
    tags: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    similar_products: "[]",
    highlights: [],
    offers: [],
    payment_options: [],
    payment_details: "",
    is_customizable: false,
    customization_fields: "[]",
    cancellation_duration: 7,
    is_cancellable: true,
    product_features: [],
    exchange_available: false,
    exchange_discount: 0,
    warranty: "",
    warranty_details: "",
    is_assured: false,
  });
  const [brands, setBrands] = useState([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [deleteMainImage, setDeleteMainImage] = useState(false);

  const [attributes, setAttributes] = useState([]);

  // Variable Products (Variants)
  const [variants, setVariants] = useState([]);
  const [variantSearch, setVariantSearch] = useState("");
  const [bundleProducts, setBundleProducts] = useState([]);
  const [bundleSearch, setBundleSearch] = useState("");
  const [bundleSearchResults, setBundleSearchResults] = useState([]);

  // Similar Products Selection
  const [similarProductSearch, setSimilarProductSearch] = useState("");
  const [similarSearchResults, setSimilarSearchResults] = useState([]);
  const [similarSearchLoading, setSimilarSearchLoading] = useState(false);
  const [selectedSimilarProducts, setSelectedSimilarProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Searchable Dropdowns
  const [categorySearch, setCategorySearch] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubcategoryDropdown, setShowSubcategoryDropdown] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  const fetchBrands = useCallback(async (catId, subId) => {
    try {
      let url = `${API_BASE_URL}/api/brands`;
      if (subId) {
        url += `?subcategory_id=${subId}`;
      } else if (catId) {
        url += `?category_id=${catId}`;
      }
      const res = await axios.get(url, { withCredentials: true });
      setBrands(res.data);
    } catch (err) {
      console.error("Failed to fetch brands", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/category`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProductGallery = useCallback(async () => {
    if (!decryptedId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/products/${decryptedId}/images`);
      setExistingGalleryImages(res.data.images || []);
    } catch (err) {
      console.error("Failed to fetch gallery images", err);
    }
  }, [decryptedId]);

  const fetchSubcategories = useCallback(async (catId) => {
    if (!catId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/subcategory/${catId}`);
      setSubcategories(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProductDetails = useCallback(async () => {
    if (!decryptedId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/products?page=1&limit=1000`);
      // Find by ID (legacy) OR url_token OR product_uid
      const product = res.data.products.find(p =>
        String(p.id) === decryptedId || p.url_token === decryptedId || p.product_uid === decryptedId
      );
      if (product) {
        setFormData({
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price || "",
          description: product.description || "",
          category_id: product.category_id,
          subcategory_id: product.subcategory_id || "",
          brand: product.brand || "",
          status: product.status || "draft",
          available_sizes: (() => {
            try {
              if (!product.available_sizes) return [];
              if (Array.isArray(product.available_sizes)) return product.available_sizes;
              if (typeof product.available_sizes === 'string') {
                // Try JSON parse first
                try {
                  return JSON.parse(product.available_sizes);
                } catch {
                  // If not JSON, treat as comma-separated string
                  return product.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
                }
              }
              return [];
            } catch (e) {
              console.error('Error parsing available_sizes:', e);
              return [];
            }
          })(),
          size_chart: product.size_chart || "",
          sku: product.sku || "",
          barcode: product.barcode || "",
          track_inventory: product.track_inventory || false,
          stock: product.stock || 0,
          stock_status: product.stock_status || "in_stock",
          weight: product.weight || "",
          dimensions: product.dimensions || "",
          shipping_class: product.shipping_class || "standard",
          tags: product.tags || "",
          styles: product.styles || "",
          attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : {},
          meta_title: product.meta_title || "",
          meta_description: product.meta_description || "",
          meta_keywords: product.meta_keywords || "",
          similar_products: product.similar_products || "[]",
          highlights: product.highlights ? (typeof product.highlights === 'string' ? JSON.parse(product.highlights) : product.highlights) : [],
          offers: product.offers ? (typeof product.offers === 'string' ? JSON.parse(product.offers) : product.offers) : [],
          payment_options: product.payment_options ? (typeof product.payment_options === 'string' ? JSON.parse(product.payment_options) : product.payment_options) : [],
          payment_details: product.payment_details || "",
          specifications: product.specifications ? (typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications) : {},
          is_customizable: Boolean(product.is_customizable),
          customization_fields: typeof product.customization_fields === 'string' ? product.customization_fields : JSON.stringify(product.customization_fields || []),
          cancellation_duration: product.cancellation_duration || 7,
          is_cancellable: product.is_cancellable === undefined ? true : Boolean(product.is_cancellable),
          product_features: product.product_features ? (typeof product.product_features === 'string' ? JSON.parse(product.product_features) : product.product_features) : [],
          is_assured: Boolean(product.is_assured),
        });
        if (product.image) setPreview(`${API_BASE_URL}${product.image.replace(/^\/?assets/, "/assets")}`);

        // Fetch selected similar products details if any
        if (product.similar_products) {
          try {
            const ids = JSON.parse(product.similar_products);
            if (ids.length > 0) {
              const resSimilar = await axios.get(`${API_BASE_URL}/products?ids=${ids.join(',')}`);
              setSelectedSimilarProducts(resSimilar.data.products || []);
            }
          } catch (e) {
            console.error("Failed to parse similar products", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  }, [decryptedId]);

  const fetchAttributes = useCallback(async (catId, subCatId) => {
    if (!catId) return;
    console.log(`🔍 Fetching attributes for Category: ${catId}, Subcategory: ${subCatId}`);
    try {
      let url = `${API_BASE_URL}/api/attributes?category_id=${catId}`;
      if (subCatId) url += `&subcategory_id=${subCatId}`;

      console.log(`🔗 Attribute API URL: ${url}`);
      const res = await axios.get(url, { withCredentials: true });

      console.log("📦 Attributes received:", res.data);
      setAttributes(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch attributes", err);
    }
  }, []);

  const fetchVariants = useCallback(async () => {
    if (!decryptedId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/products/${decryptedId}/variants`);
      setVariants(res.data.variants || []);
    } catch (err) {
      console.error("Failed to fetch variants", err);
    }
  }, [decryptedId]);

  const fetchBundles = useCallback(async () => {
    if (!decryptedId) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bundles/${decryptedId}`);
      setBundleProducts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch bundles", err);
    }
  }, [decryptedId]);

  const handleBundleSearch = async (query) => {
    setBundleSearch(query);
    if (query.length < 2) {
      setBundleSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/products?search=${query}&limit=5`);
      setBundleSearchResults((res.data.products || []).filter(p => String(p.id) !== decryptedId && p.product_uid !== decryptedId && p.url_token !== decryptedId));
    } catch (e) { }
  };

  const addBundle = async (p) => {
    if (!decryptedId) {
      toastError("Please save the product first to manage bundles.");
      return;
    }
    if (!decryptedId) {
      // If no ID, just add to local state for post-save persistence
      setBundleProducts(prev => [...prev, p]);
      setBundleSearch("");
      setBundleSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
      await axios.post(`${API_BASE_URL}/api/bundles/${decryptedId}`, { bundle_product_id: p.id }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      setBundleProducts(prev => [...prev, p]);
      setBundleSearch("");
      setBundleSearchResults([]);
      toastSuccess("Bundle added");
    } catch (e) {
      toastError(e.response?.data?.message || "Failed to add bundle");
    }
  };

  const removeBundle = async (bundleId) => {
    if (!decryptedId) {
      setBundleProducts(prev => prev.filter(p => p.id !== bundleId));
      return;
    }
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
      await axios.delete(`${API_BASE_URL}/api/bundles/${decryptedId}/${bundleId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      setBundleProducts(prev => prev.filter(p => p.id !== bundleId));
      toastSuccess("Bundle removed");
    } catch (e) {
      toastError("Failed to remove bundle");
    }
  };

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchProductDetails();
      fetchProductGallery();
      fetchVariants();
      fetchBundles();
      fetchBrands(formData.category_id, formData.subcategory_id);
    } else {
      fetchBrands();
    }
  }, [isEditMode, fetchCategories, fetchProductDetails, fetchProductGallery, fetchVariants, fetchBundles, fetchBrands, formData.category_id, formData.subcategory_id]);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
      fetchAttributes(formData.category_id, formData.subcategory_id);
      // Fetch brands for this category or subcategory
      fetchBrands(formData.category_id, formData.subcategory_id);
    } else {
      setSubcategories([]);
      setAttributes([]);
      fetchBrands(); // Reset to all brands if no category selected
    }
  }, [formData.category_id, formData.subcategory_id, fetchSubcategories, fetchAttributes, fetchBrands]);


  const handleDeleteGalleryImage = useCallback((imageId) => {
    setExistingGalleryImages(prev => prev.filter(img => img.id !== imageId));
    setDeletedImageIds(prev => [...prev, imageId]);
  }, []);

  const removeGalleryImage = useCallback((index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Search products for variant selection
  const searchProducts = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/products/search/by-name`, {
        params: { q: query, exclude_id: decryptedId }
      });
      setSearchResults(res.data.products || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearchLoading(false);
    }
  }, [decryptedId]);

  const searchSimilarProducts = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSimilarSearchResults([]);
      return;
    }

    setSimilarSearchLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/products/search/by-name`, {
        params: { q: query, exclude_id: decryptedId }
      });
      setSimilarSearchResults(res.data.products || []);
    } catch (err) {
      console.error("Similar products search failed", err);
    } finally {
      setSimilarSearchLoading(false);
    }
  }, [decryptedId]);

  const addSimilarProduct = (prod) => {
    if (selectedSimilarProducts.some(p => p.id === prod.id)) return;
    const updated = [...selectedSimilarProducts, prod];
    setSelectedSimilarProducts(updated);
    setFormData(prev => ({ ...prev, similar_products: JSON.stringify(updated.map(p => p.id)) }));
    setSimilarProductSearch("");
    setSimilarSearchResults([]);
  };

  const removeSimilarProduct = (prodId) => {
    const updated = selectedSimilarProducts.filter(p => p.id !== prodId);
    setSelectedSimilarProducts(updated);
    setFormData(prev => ({ ...prev, similar_products: JSON.stringify(updated.map(p => p.id)) }));
  };

  // Add a product as variant
  const handleAddVariant = useCallback(async (productId) => {
    if (!decryptedId) {
      const p = searchResults.find(pr => pr.id === productId);
      if (p) setVariants(prev => [...prev, p]);
      setVariantSearch("");
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
      await axios.post(`${API_BASE_URL}/products/${decryptedId}/variants`, {
        child_id: productId
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      toastSuccess("Variant added successfully");
      fetchVariants();
      setVariantSearch("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to add variant", err);
      toastError(err.response?.data?.message || "Failed to add variant");
    }
  }, [decryptedId, fetchVariants, searchResults]);

  // Remove a variant
  const handleRemoveVariant = useCallback(async (variantId) => {
    if (!decryptedId) {
      setVariants(prev => prev.filter(p => p.id !== variantId));
      return;
    }
    confirm({
      title: "Remove Variant?",
      message: "Are you sure you want to remove this variant link? This action will break the connection between these products.",
      confirmText: "Remove Link",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
          await axios.delete(`${API_BASE_URL}/products/${decryptedId}/variants/${variantId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true
          });
          toastSuccess("Variant removed successfully");
          fetchVariants();
        } catch (err) {
          console.error("Failed to remove variant", err);
          toastError("Failed to remove variant");
        }
      }
    });
  }, [confirm, decryptedId, fetchVariants]);
  useEffect(() => {
    const selectedCat = categories.find(c => c.id === parseInt(formData.category_id));
    if (selectedCat) {
      setCategorySearch(selectedCat.name);
    } else {
      setCategorySearch("");
    }
  }, [formData.category_id, categories]);

  useEffect(() => {
    const selectedSub = subcategories.find(s => s.id === parseInt(formData.subcategory_id));
    if (selectedSub) {
      setSubcategorySearch(selectedSub.name);
    } else {
      setSubcategorySearch("");
    }
  }, [formData.subcategory_id, subcategories]);

  useEffect(() => {
    if (formData.brand) {
      setBrandSearch(formData.brand);
    }
  }, [formData.brand]);


  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle dynamic attribute changes
    if (name.startsWith('attr_')) {
      const attrName = name.replace('attr_', '');
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [attrName]: value
        }
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "name" && !isEditMode) {
      setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, '-') }));
    }
  };

  const [showJsonEditor, setShowJsonEditor] = useState(false);

  const getCustomizationFields = () => {
    try {
      const parsed = typeof formData.customization_fields === 'string'
        ? JSON.parse(formData.customization_fields || "[]")
        : formData.customization_fields;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const updateField = (index, updates) => {
    const fields = [...getCustomizationFields()];
    fields[index] = { ...fields[index], ...updates };
    setFormData(prev => ({ ...prev, customization_fields: JSON.stringify(fields) }));
  };

  const addField = (type) => {
    const fields = [...getCustomizationFields()];
    const labels = {
      text: "Message / Name",
      textarea: "Instruction Box",
      date: "Event Date",
      image: "Reference Image"
    };
    const newField = {
      name: `${type}_${Date.now()}`,
      type: type,
      label: labels[type] || "New Field",
      required: false,
      placeholder: `Enter ${labels[type] || "details"}...`
    };
    setFormData(prev => ({ ...prev, customization_fields: JSON.stringify([...fields, newField]) }));
  };

  const removeField = (index) => {
    const fields = getCustomizationFields().filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, customization_fields: JSON.stringify(fields) }));
  };


  const handleAttributeCheckbox = (attrName, optionValue, isChecked) => {
    setFormData(prev => {
      const currentValues = prev.attributes?.[attrName] || [];
      const currentArray = Array.isArray(currentValues) ? currentValues : [];

      let newArray;
      if (isChecked) {
        newArray = [...currentArray, optionValue];
      } else {
        newArray = currentArray.filter(v => v !== optionValue);
      }

      return {
        ...prev,
        attributes: {
          ...prev.attributes,
          [attrName]: newArray
        }
      };
    });
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filter subcategories based on search
  const filteredSubcategories = subcategories.filter(sub =>
    sub.name.toLowerCase().includes(subcategorySearch.toLowerCase())
  );

  // Handle category selection
  const handleCategorySelect = (categoryId, categoryName) => {
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: "" }));
    setCategorySearch(categoryName);
    setShowCategoryDropdown(false);
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategoryId, subcategoryName) => {
    setFormData(prev => ({ ...prev, subcategory_id: subcategoryId }));
    setSubcategorySearch(subcategoryName);
    setShowSubcategoryDropdown(false);
  };

  const handleBrandSelect = (brandName) => {
    setFormData(prev => ({ ...prev, brand: brandName }));
    setBrandSearch(brandName);
    setShowBrandDropdown(false);
  };


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setDeleteMainImage(false); // Clear the delete flag if new image uploaded
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setGalleryImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newPreviews]);
    }
  };



  const handleDiscard = () => {
    confirm({
      title: "Discard Changes?",
      message: "Are you sure you want to discard changes? Any unsaved progress will be lost.",
      confirmText: "Discard",
      onConfirm: () => {
        navigate("/admin/products");
      }
    });
  };

  const handleSaveDraft = async () => {
    await handleSubmit(null, "draft");
  };

  const handlePublish = async () => {
    await handleSubmit(null, "published");
  };

  const handleSubmit = async (e, statusOverride) => {
    if (e) e.preventDefault();

    // Validate required fields
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price || formData.price === '') {
      newErrors.price = 'Price is required';
    } else if (parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!preview && !image && !isEditMode) {
      newErrors.image = 'Product image is required';
    }

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    // Validate Customization JSON if enabled
    if (formData.is_customizable && formData.customization_fields) {
      try {
        const parsed = JSON.parse(formData.customization_fields);
        if (!Array.isArray(parsed)) {
          toastError("Customization fields must be a JSON array (e.g. [ { ... } ])");
          return;
        }
      } catch (e) {
        toastError("Invalid JSON in Customization Fields. Please check the syntax.");
        return;
      }
    }

    setLoading(true);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key === "status") {
        data.append(key, statusOverride || formData[key]);
      } else if (key === "available_sizes") {
        // Serialize array as JSON string
        data.append(key, JSON.stringify(formData[key]));
      } else if (key === "attributes") {
        data.append(key, JSON.stringify(formData[key]));
      } else if (['highlights', 'offers', 'payment_options', 'specifications'].includes(key)) {
        data.append(key, JSON.stringify(formData[key] || (key === 'specifications' ? {} : [])));
      } else if (key === "is_customizable") {
        data.append(key, formData[key] ? "1" : "0");
      } else if (key === "customization_fields") {
        data.append(key, formData[key] || "[]");
      } else if (key === "is_cancellable" || key === "is_assured") {
        data.append(key, formData[key] ? "1" : "0");
      } else if (key === "payment_details") {
        data.append(key, typeof formData[key] === 'object' ? JSON.stringify(formData[key]) : (formData[key] || ""));
      } else if (key === "product_features") {
        data.append(key, JSON.stringify(formData[key] || []));
      } else {
        data.append(key, formData[key]);
      }
    });

    // Handle Feature Images
    const featureImages = formData.product_features
      .filter(f => f.file)
      .map(f => f.file);

    if (featureImages.length > 0) {
      featureImages.forEach(file => {
        data.append("feature_images", file);
      });
    }

    if (image) data.append("image", image);
    if (galleryImages.length > 0) {
      galleryImages.forEach(file => {
        data.append("gallery_images", file);
      });
    }
    // Append deleted gallery image IDs
    if (deletedImageIds.length > 0) {
      data.append("deleted_image_ids", JSON.stringify(deletedImageIds));
    }
    // Append delete main image flag
    if (deleteMainImage) {
      data.append("delete_main_image", "true");
    }

    try {
      let productId = decryptedId;
      const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
      const config = {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      };

      if (isEditMode) {
        await axios.put(`${API_BASE_URL}/products/${decryptedId}`, data, config);
        toastSuccess("Product updated successfully!");
      } else {
        const res = await axios.post(`${API_BASE_URL}/products`, data, config);
        productId = res.data.id || res.data.product_id;
        toastSuccess("Product created successfully!");
      }

      // Persist Bundles and Variants if they were added during creation
      if (!isEditMode && productId) {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("userToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Persist Bundles
        for (const bundle of bundleProducts) {
          try {
            await axios.post(`${API_BASE_URL}/api/bundles/${productId}`, { bundle_product_id: bundle.id }, { headers, withCredentials: true });
          } catch (e) { console.error("Failed to persist bundle", e); }
        }

        // Persist Variants
        for (const variant of variants) {
          try {
            await axios.post(`${API_BASE_URL}/products/${productId}/variants`, { child_id: variant.id }, { headers, withCredentials: true });
          } catch (e) { console.error("Failed to persist variant", e); }
        }
      }

      setTimeout(() => navigate("/admin/products"), 1500);
    } catch (err) {
      console.error(err);
      let errorDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      if (typeof errorDetails === 'object') {
        errorDetails = JSON.stringify(errorDetails);
      }
      toastError(`${isEditMode ? "Failed to update product" : "Failed to create product"}: ${errorDetails}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hover:text-[#dc3545] cursor-pointer" onClick={() => navigate("/admin/products")}>Products</span>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">{isEditMode ? "Edit product" : "Add a product"}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-[#dc3545] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Publishing..." : "Publish product"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Product Title
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Write title here..."
                data-error={!!errors.name}
                className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors.name
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                  }`}
                required
              />
              {errors.name && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Product Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Product Description</label>

              {/* Simple Toolbar */}
              <div className="flex items-center gap-1 mb-3 pb-3 border-b border-gray-200">
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Bold">
                  <Bold size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Italic">
                  <Italic size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Underline">
                  <Underline size={16} className="text-gray-600" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Bullet List">
                  <List size={16} className="text-gray-600" />
                </button>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Numbered List">
                  <ListOrdered size={16} className="text-gray-600" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button type="button" className="p-2 hover:bg-gray-100 rounded" title="Insert Link">
                  <LinkIcon size={16} className="text-gray-600" />
                </button>
              </div>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Write a description here..."
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="8"
              ></textarea>
            </div>

            {/* Display Images */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Main product image
                <span className="text-red-500 ml-1">*</span>
              </label>

              <div className={`border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer ${errors.image ? 'border-red-500' : 'border-gray-300'
                }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  {preview ? (
                    <div className="relative inline-block">
                      <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImage(null);
                          setPreview(null);
                          setDeleteMainImage(true);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-12 h-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Drop your image here, or browse</p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF - Max 5MB</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
              {errors.image && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.image}
                </p>
              )}
            </div>

            {/* Gallery Images */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Product Gallery</label>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer mb-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryChange}
                  className="hidden"
                  id="gallery-upload"
                />
                <label htmlFor="gallery-upload" className="cursor-pointer w-full h-full block">
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-blue-50 p-3 rounded-full">
                      <List size={24} className="text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="text-blue-600 font-medium">Add images</span> to gallery
                    </p>
                  </div>
                </label>
              </div>

              {/* Existing Gallery Images (from DB) */}
              {existingGalleryImages.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Existing Images</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {existingGalleryImages.map((img) => (
                      <div key={img.id} className="relative group border rounded-lg overflow-hidden h-24">
                        <img
                          src={`${API_BASE_URL}${img.image_url.replace(/^\/?assets/, "/assets")}`}
                          alt="Gallery"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryImage(img.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          title="Delete image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Upload Previews */}
              {galleryPreviews.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New Uploads</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {galleryPreviews.map((src, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden h-24">
                        <img src={src} alt={`New Upload ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Features Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <FeatureManager
                features={formData.product_features}
                onChange={(newFeatures) => setFormData(prev => ({ ...prev, product_features: newFeatures }))}
              />
            </div>

            {/* Inventory Section */}
            <InventorySection
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
              errors={errors}
              attributes={attributes}
              handleAttributeCheckbox={handleAttributeCheckbox}
              fetchAttributes={fetchAttributes}
            />

            {/* SEO Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">SEO Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO Title (defaults to Name if empty)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="SEO Description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    name="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Comma separated keywords"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Organize Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Organize</h3>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Category
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <button type="button" className="text-xs text-blue-600 hover:underline">
                      Add new category
                    </button>
                  </div>

                  {/* Searchable Dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search category..."
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      data-error={!!errors.category_id}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errors.category_id
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      required={!formData.category_id}
                    />

                    {showCategoryDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)}></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((cat) => (
                              <div
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id, cat.name)}
                                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${formData.category_id === cat.id ? 'bg-blue-100 font-medium' : ''
                                  }`}
                              >
                                {cat.name}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No categories found</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {errors.category_id && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.category_id}
                    </p>
                  )}
                </div>

                {/* Subcategory/Vendor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Subcategory</label>
                    <button type="button" className="text-xs text-blue-600 hover:underline">
                      Add new subcategory
                    </button>
                  </div>

                  {/* Searchable Dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={!formData.category_id ? "Select category first..." : "Search subcategory..."}
                      value={subcategorySearch}
                      onChange={(e) => {
                        setSubcategorySearch(e.target.value);
                        setShowSubcategoryDropdown(true);
                      }}
                      onFocus={() => formData.category_id && setShowSubcategoryDropdown(true)}
                      disabled={!formData.category_id}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />

                    {showSubcategoryDropdown && formData.category_id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowSubcategoryDropdown(false)}></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {(() => {
                            const groups = filteredSubcategories.filter(s => !s.parent_id);

                            if (groups.length === 0) {
                              return <div className="px-3 py-2 text-sm text-gray-500">No subcategories found</div>;
                            }

                            return groups.map(group => {
                              const children = filteredSubcategories.filter(s => s.parent_id === group.id);

                              if (children.length === 0) {
                                return (
                                  <div
                                    key={group.id}
                                    onClick={() => handleSubcategorySelect(group.id, group.name)}
                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${formData.subcategory_id === group.id ? 'bg-blue-100 font-medium' : ''
                                      }`}
                                  >
                                    {group.name}
                                  </div>
                                );
                              }

                              return (
                                <div key={group.id}>
                                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50">
                                    {group.name}
                                  </div>
                                  {children.map(child => (
                                    <div
                                      key={child.id}
                                      onClick={() => handleSubcategorySelect(child.id, child.name)}
                                      className={`px-5 py-2 cursor-pointer hover:bg-blue-50 text-sm ${formData.subcategory_id === child.id ? 'bg-blue-100 font-medium' : ''
                                        }`}
                                    >
                                      {child.name}
                                    </div>
                                  ))}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>



                {/* Variable Products (Linked Variants) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Variable Products</label>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search products to add as variants..."
                        value={variantSearch}
                        onChange={(e) => {
                          setVariantSearch(e.target.value);
                          searchProducts(e.target.value);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-t-blue-600 border-gray-200 rounded-full animate-spin"></div>
                        </div>
                      )}

                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => handleAddVariant(product.id)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <img
                                src={`${API_BASE_URL}${product.image}`}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">₹{product.price}</p>
                              </div>
                              <button className="text-blue-600 text-xs font-medium">Add</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Linked Variants List */}
                    {variants.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 font-medium">Linked Variants ({variants.length})</p>
                        {variants.map((variant) => (
                          <div key={variant.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                            <img
                              src={`${API_BASE_URL}${variant.image}`}
                              alt={variant.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{variant.name}</p>
                              <p className="text-xs text-gray-500">₹{variant.price}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveVariant(variant.id)}
                              className="text-red-600 hover:text-red-700 p-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No variants linked yet. Search to add products as variants.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Brand
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or select brand..."
                    value={brandSearch}
                    onChange={(e) => {
                      setBrandSearch(e.target.value);
                      setShowBrandDropdown(true);
                      setFormData(prev => ({ ...prev, brand: e.target.value })); // Allow custom brand if needed
                    }}
                    onFocus={() => setShowBrandDropdown(true)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showBrandDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowBrandDropdown(false)}></div>
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).length > 0 ? (
                          brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).map((brand) => (
                            <div
                              key={brand.id}
                              onClick={() => handleBrandSelect(brand.name)}
                              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${formData.brand === brand.name ? 'bg-blue-100 font-medium' : ''}`}
                            >
                              {brand.name}
                            </div>
                          ))
                        ) : (
                          brandSearch && (
                            <div
                              onClick={() => setShowBrandDropdown(false)}
                              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer italic"
                            >
                              Use "{brandSearch}" as new brand
                            </div>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Product Segments (Tags) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Segments</label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {[
                    { id: 'best_seller', label: 'Best Seller' },
                    { id: 'new_arrival', label: 'New Arrival' },
                    { id: 'trending', label: 'Trending Now' },
                    { id: 'featured', label: 'Featured Brand' },
                    { id: 'top_rated', label: 'Top Rated' },
                  ].map((segment) => (
                    <label key={segment.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tags?.includes(segment.id)}
                        onChange={(e) => {
                          const currentTags = formData.tags ? formData.tags.split(',').filter(Boolean) : [];
                          let newTags;
                          if (e.target.checked) {
                            newTags = [...currentTags, segment.id];
                          } else {
                            newTags = currentTags.filter(t => t !== segment.id);
                          }
                          setFormData(prev => ({ ...prev, tags: newTags.join(',') }));
                        }}
                        className="w-4 h-4 text-[#dc3545] rounded focus:ring-0"
                      />
                      <span className="text-sm text-gray-700">{segment.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequently Bought Together */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers size={18} className="text-gray-900" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Frequently Bought Together</h3>
                </div>

                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search products to bundle..."
                    value={bundleSearch}
                    onChange={(e) => handleBundleSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {bundleSearchResults.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {bundleSearchResults.map((prod) => (
                        <div
                          key={prod.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b last:border-0"
                          onClick={() => addBundle(prod)}
                        >
                          <div className="flex items-center gap-3">
                            {prod.image && <img src={`${API_BASE_URL}${prod.image}`} className="w-10 h-10 object-contain rounded bg-gray-50 p-1" alt={prod.name} />}
                            <div className="text-xs">
                              <p className="font-bold text-gray-900">{prod.name}</p>
                              <p className="text-gray-500">Price: ₹{prod.sale_price}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold uppercase">Add</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {bundleProducts.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No products bundled yet.
                    </div>
                  ) : (
                    bundleProducts.map((prod) => (
                      <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group transition-all hover:bg-white hover:shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1">
                            <img src={`${API_BASE_URL}${prod.image}`} className="w-full h-full object-contain" alt={prod.name} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900 line-clamp-1">{prod.name}</p>
                            <p className="text-[10px] font-medium text-gray-500">Price: ₹{prod.sale_price}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBundle(prod.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Similar Products */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Manual Similar Products</h3>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search similar products..."
                    value={similarProductSearch}
                    onChange={(e) => {
                      setSimilarProductSearch(e.target.value);
                      searchSimilarProducts(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {similarSearchLoading && <div className="absolute right-3 top-2.5 text-xs text-gray-400">Loading...</div>}

                  {similarSearchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {similarSearchResults.map((prod) => (
                        <div
                          key={prod.id}
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b last:border-0"
                          onClick={() => addSimilarProduct(prod)}
                        >
                          <div className="flex items-center gap-2">
                            {prod.image && <img src={`${API_BASE_URL}${prod.image}`} className="w-8 h-8 object-cover rounded" alt={prod.name} />}
                            <div className="text-xs">
                              <p className="font-medium text-gray-900">{prod.name}</p>
                              <p className="text-gray-500">SKU: {prod.sku || 'N/A'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">Add</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedSimilarProducts.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <img src={`${API_BASE_URL}${prod.image}`} className="w-8 h-8 object-cover rounded" alt={prod.name} />
                        <div className="text-[11px]">
                          <p className="font-medium text-gray-900 line-clamp-1">{prod.name}</p>
                          <p className="text-gray-500">{prod.price}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSimilarProduct(prod.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {selectedSimilarProducts.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4 italic">No similar products selected</p>
                  )}
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="product-slug"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated from title</p>
              </div>

              {/* Size Selection (for clothing) */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Product Sizes</label>
                <p className="text-xs text-gray-500 mb-3">Select available sizes for clothing items</p>

                <div className="flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          available_sizes: prev.available_sizes.includes(size)
                            ? prev.available_sizes.filter(s => s !== size)
                            : [...prev.available_sizes, size]
                        }));
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${formData.available_sizes.includes(size)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {formData.available_sizes.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    Selected: {formData.available_sizes.join(', ')}
                  </p>
                )}
              </div>

              {/* Product Personalization / Customization */}
              <div className="bg-white rounded-lg border border-orange-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 italic">Product Personalization</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Allow customers to add custom details</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.is_customizable}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_customizable: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {formData.is_customizable && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                    {/* Visual Field Builder */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-orange-700 uppercase tracking-widest">Setup Custom Questions</label>
                        <button
                          type="button"
                          onClick={() => setShowJsonEditor(!showJsonEditor)}
                          className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                        >
                          <Settings2 size={12} />
                          {showJsonEditor ? "Switch to Visual View" : "Advanced JSON View"}
                        </button>
                      </div>

                      {!showJsonEditor ? (
                        <div className="space-y-3">
                          {getCustomizationFields().length === 0 ? (
                            <div className="p-8 border-2 border-dashed border-orange-100 rounded-xl flex flex-col items-center justify-center text-center bg-orange-50/10">
                              <Wand2 size={24} className="text-orange-200 mb-2" />
                              <p className="text-sm font-medium text-gray-500">No custom questions added yet</p>
                              <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Use the buttons below to start building your customization form</p>
                            </div>
                          ) : (
                            getCustomizationFields().map((field, idx) => (
                              <div key={idx} className="group p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition-all">
                                <div className="flex items-start gap-2">
                                  <div className="p-2.5 bg-gray-50 rounded-lg text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                    {field.type === 'text' && <Type size={18} />}
                                    {field.type === 'textarea' && <FileText size={18} />}
                                    {field.type === 'date' && <Calendar size={18} />}
                                    {field.type === 'image' && <ImageIcon size={18} />}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(idx, { label: e.target.value })}
                                        placeholder="Question Label (e.g. Text on Mug)"
                                        className="flex-1 bg-transparent text-sm font-bold text-gray-900 border-none p-0 focus:ring-0 placeholder:text-gray-300"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeField(idx)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 border-t border-gray-50 pt-3">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={field.required}
                                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                                          className="w-3.5 h-3.5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                        />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Is Required?</span>
                                      </label>
                                      <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-50 rounded text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                                        Type: {field.type}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}

                          {/* Simplified Add Buttons */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => addField('text')}
                              className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                              <Type size={18} className="text-gray-400 group-hover:text-orange-500" />
                              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Add Text</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addField('textarea')}
                              className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                              <FileText size={18} className="text-gray-400 group-hover:text-orange-500" />
                              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Big Box</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addField('date')}
                              className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                              <Calendar size={18} className="text-gray-400 group-hover:text-orange-500" />
                              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Add Date</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addField('image')}
                              className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                            >
                              <ImageIcon size={18} className="text-gray-400 group-hover:text-orange-500" />
                              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Add Photo</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <textarea
                            value={formData.customization_fields}
                            onChange={(e) => setFormData(prev => ({ ...prev, customization_fields: e.target.value }))}
                            className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-gray-900 text-green-400"
                            rows="6"
                            placeholder='[{"name": "name", "type": "text", "label": "Full Name"}]'
                          ></textarea>
                          <p className="text-[10px] text-gray-400 italic">Advanced: Directly edit the technical format if you know what you are doing.</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-orange-800">
                        <Wand2 size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest">How it works</h4>
                      </div>
                      <p className="text-[11px] text-orange-700 leading-relaxed">
                        When a customer buys this product, they will see a beautiful form with the questions you defined above.
                        <br /><br />
                        <span className="font-bold">Production Tracking:</span> You can track the progress of these orders using the separate <span className="underline italic">Production Status</span> (Pending, Designing, Printing, etc.) available in the order details.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Assured Badge Widget */}
              <div className="bg-white rounded-lg border border-blue-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 italic flex items-center gap-2">
                      Assured Product
                      <img
                        src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_627d6a.png"
                        alt="Assured"
                        className="h-3.5 object-contain"
                      />
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Display "Assured" badge on this product</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.is_assured}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_assured: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[10px] text-blue-600 mt-2 font-medium italic">
                  Checking this adds the premium "Assured" quality badge to your product across the platform.
                </p>
              </div>

              {/* Cancellation Policy Widget */}
              <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 italic">Cancellation Policy</h3>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Configure product-level order cancellation</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.is_cancellable}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_cancellable: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {formData.is_cancellable ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cancellation Window (Days)</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="cancellation_duration"
                          value={formData.cancellation_duration}
                          onChange={(e) => setFormData(prev => ({ ...prev, cancellation_duration: e.target.value }))}
                          className="w-full pl-5 pr-12 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-black"
                          placeholder="e.g. 7"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                          Days
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium italic">
                        Customers can cancel their order within this many days after purchase.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">
                      Cancellation Disabled: This product will be marked as non-cancellable.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
