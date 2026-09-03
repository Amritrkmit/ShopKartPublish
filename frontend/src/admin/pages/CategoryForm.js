import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Upload, X } from "lucide-react";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function Category({ parentOptions = [], onSuccess }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Brands Mapping
  const [allBrands, setAllBrands] = useState([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");

  // Check if we are in Edit Mode
  const isEditMode = Boolean(id);
  const apiUrl = isEditMode ? `${API_BASE_URL}/category/${id}` : `${API_BASE_URL}/category`;

  const fetchCategoryDetails = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/category`);
      // Match by url_token (preferred) or ID (fallback)
      const cat = res.data.find(c => (c.url_token && c.url_token === id) || c.id.toString() === id);
      if (cat) {
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || "");
        setParentId(cat.parent_id || "");
        setActive(Boolean(cat.active));
        if (cat.image) {
          setImagePreview(`${API_BASE_URL}${cat.image.replace(/^\/?assets/, "/assets")}`);
        }

        // SEO
        setMetaTitle(cat.meta_title || "");
        setMetaDescription(cat.meta_description || "");
        setMetaKeywords(cat.meta_keywords || "");

        // Fetch Mapped Brands
        const mappingRes = await axios.get(`${API_BASE_URL}/api/brands/mappings?category_id=${id}`, {
          withCredentials: true
        });
        setSelectedBrandIds(mappingRes.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  }, [id]);

  const fetchAllBrands = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/brands/all`, {
        withCredentials: true
      });
      setAllBrands(res.data || []);
    } catch (err) {
      console.error("Failed to fetch brands", err);
    }
  }, []);

  useEffect(() => {
    fetchAllBrands();
    if (isEditMode) {
      fetchCategoryDetails();
    }
  }, [isEditMode, fetchCategoryDetails, fetchAllBrands]);

  useEffect(() => {
    if (!isEditMode && name) {
      setSlug(name.toLowerCase().replace(/\s+/g, "-"));
    }
  }, [name, isEditMode]);


  const handleImageChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      if (!isEditMode) {
        setImageFile(null);
        setImagePreview(null);
      }
      return;
    }
    if (!f.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Only image files allowed" }));
      return;
    }
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.image;
      return copy;
    });
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(f);
  };

  const handleDiscard = () => {
    confirm({
      title: "Discard Changes?",
      message: "Are you sure you want to discard your changes? Unsaved progress will be lost.",
      confirmText: "Discard Changes",
      onConfirm: () => {
        navigate("/admin/category");
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage("");
    setSubmitting(true);

    if (!name.trim() || !slug.trim()) {
      const newErrors = {};
      if (!name.trim()) newErrors.name = "Category name is required";
      if (!slug.trim()) newErrors.slug = "Slug name is required";
      setErrors(newErrors);
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("slug", slug);
      formData.append("description", description);
      formData.append("parentId", parentId);
      formData.append("active", active);

      // Append SEO
      formData.append("meta_title", metaTitle);
      formData.append("meta_description", metaDescription);
      formData.append("meta_keywords", metaKeywords);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      // Add Brands
      formData.append("brandIds", selectedBrandIds.join(","));

      const method = isEditMode ? "put" : "post";
      const res = await axios[method](apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setMessage(res.data.message);
      setTimeout(() => navigate("/admin/category"), 1500);

    } catch (error) {
      setMessage(error.response?.data?.message || "❌ Error submitting form");
    } finally {
      setSubmitting(false);
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
              <span className="hover:text-[#dc3545] cursor-pointer" onClick={() => navigate("/admin/category")}>Categories</span>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">{isEditMode ? "Edit Category" : "Add Category"}</span>
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
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium text-white bg-[#dc3545] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && <div className={`mb-4 p-4 rounded ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Category Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Category Details</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Electronics"
                  />
                  {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Short description..."
                  />
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">SEO Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO Title (defaults to Name if empty)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <textarea
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    placeholder="SEO Description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="Comma separated keywords"
                  />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Category Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="cat-image-upload"
                />
                <label htmlFor="cat-image-upload" className="cursor-pointer w-full h-full block">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={32} className="text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Drag your photo here or <span className="text-blue-600 font-medium">Browse</span>
                      </p>
                    </div>
                  )}
                </label>
              </div>
              {errors.image && <div className="text-red-500 text-sm mt-1">{errors.image}</div>}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">

            {/* Organize */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Organize</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category</label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">-- None (Top Level) --</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.slug ? "border-red-500" : "border-gray-300"}`}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated from name</p>
                  {errors.slug && <div className="text-red-500 text-xs mt-1">{errors.slug}</div>}
                </div>

                {/* Brand Selection */}
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relevant Brands</label>
                  <div className="flex items-center gap-4 mb-2">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={allBrands.length > 0 && allBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).every(b => selectedBrandIds.includes(b.id))}
                        onChange={(e) => {
                          const filteredIds = allBrands
                            .filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase()))
                            .map(b => b.id);

                          if (e.target.checked) {
                            setSelectedBrandIds(prev => [...new Set([...prev, ...filteredIds])]);
                          } else {
                            setSelectedBrandIds(prev => prev.filter(id => !filteredIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-xs font-medium text-gray-700">Select All</span>
                    </label>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                    {allBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).map(brand => (
                      <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedBrandIds.includes(brand.id)}
                          onChange={() => {
                            if (selectedBrandIds.includes(brand.id)) {
                              setSelectedBrandIds(prev => prev.filter(bid => bid !== brand.id));
                            } else {
                              setSelectedBrandIds(prev => [...prev, brand.id]);
                            }
                          }}
                          className="w-4 h-4 text-[#dc3545] border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900">{brand.name}</span>
                      </label>
                    ))}
                    {allBrands.length === 0 && <p className="text-xs text-gray-400 italic">No brands found</p>}
                    {allBrands.length > 0 && allBrands.filter(b => b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())).length === 0 && (
                      <p className="text-xs text-gray-400 italic">No matching brands</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Select brands that belong to this category</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Status</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}