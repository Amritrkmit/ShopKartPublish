import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Upload, X } from "lucide-react";
import { useConfirmation } from "../../context/ConfirmationContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SubcategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const isEditMode = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]); // For nesting
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState(""); // Category ID
  const [parentSubId, setParentSubId] = useState(""); // Nested Parent ID
  const [active, setActive] = useState(true);

  // SEO Fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Brands Mapping
  const [allBrands, setAllBrands] = useState([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");

  // Fetch parent categories
  useEffect(() => {
    axios.get(`${API_BASE_URL}/category`).then((res) => setCategories(res.data))
      .catch((err) => console.error("❌ Error fetching categories:", err));

    // Fetch all brands
    axios.get(`${API_BASE_URL}/api/brands/all`, {
      withCredentials: true
    }).then(res => setAllBrands(res.data))
      .catch(err => console.error("❌ Error fetching brands:", err));
  }, []);

  // Fetch existing subcategory data if editing
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      axios.get(`${API_BASE_URL}/subcategory`)
        .then((res) => {
          // Match by url_token (preferred) or ID (fallback)
          const subcategory = res.data.find(s => (s.url_token && s.url_token === id) || s.id.toString() === id);
          if (subcategory) {
            setName(subcategory.name);
            setSlug(subcategory.slug);
            setDescription(subcategory.description || "");
            setParentId(subcategory.category_id.toString());
            setParentSubId(subcategory.parent_id ? subcategory.parent_id.toString() : "");
            setActive(Boolean(subcategory.active));
            if (subcategory.image) {
              setImagePreview(`${API_BASE_URL}${subcategory.image.replace(/^\/?assets/, "/assets")}`);
            }
            // SEO
            setMetaTitle(subcategory.meta_title || "");
            setMetaDescription(subcategory.meta_description || "");
            setMetaKeywords(subcategory.meta_keywords || "");

            // Fetch Mapped Brands
            axios.get(`${API_BASE_URL}/api/brands/mappings?subcategory_id=${id}`, {
              withCredentials: true
            }).then(mRes => setSelectedBrandIds(mRes.data || []))
              .catch(err => console.error("Mapping fetch error", err));

          } else {
            setMessage("❌ Subcategory not found");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching subcategory:", err);
          setMessage("❌ Failed to load subcategory data");
          setLoading(false);
        });
    }
  }, [id, isEditMode]);

  // Auto-slug (only for new entries)
  useEffect(() => {
    if (name && !isEditMode) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  }, [name, isEditMode]);

  // Fetch subcategories when Category changes
  useEffect(() => {
    if (parentId) {
      axios.get(`${API_BASE_URL}/subcategory/${parentId}`)
        .then(res => {
          // Only show Top-Level Groups as potential parents to avoid infinite depth
          const groups = res.data.filter(s => !s.parent_id);
          setSubcategories(groups);
        })
        .catch(err => console.error("Error fetching subcats", err));
    } else {
      setSubcategories([]);
    }
  }, [parentId]);

  const handleImageChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) {
      if (!isEditMode) {
        setImageFile(null);
        setImagePreview(null);
      }
      return;
    }
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
        navigate("/admin/subcategory");
      }
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !slug || !parentId) {
      setMessage("⚠️ Please fill all required fields");
      return;
    }
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("description", description);
    formData.append("parentId", parentId);
    formData.append("parentSubId", parentSubId || "");
    formData.append("active", active);

    // SEO
    formData.append("meta_title", metaTitle);
    formData.append("meta_description", metaDescription);
    formData.append("meta_keywords", metaKeywords);

    if (imageFile) formData.append("image", imageFile);

    // Brands
    formData.append("brandIds", selectedBrandIds.join(","));

    try {
      let res;
      if (isEditMode) {
        res = await axios.put(`${API_BASE_URL}/subcategory/${id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axios.post(`${API_BASE_URL}/subcategory`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setMessage(res.data.message);
      setTimeout(() => {
        navigate("/admin/subcategory");
      }, 1500);
    } catch (err) {
      setMessage(`❌ Error ${isEditMode ? 'updating' : 'creating'} subcategory`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hover:text-[#dc3545] cursor-pointer" onClick={() => navigate("/admin/subcategory")}>Subcategories</span>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">{isEditMode ? "Edit Subcategory" : "Add Subcategory"}</span>
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
                {submitting ? "Saving..." : "Save Subcategory"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && <div className={`mb-4 p-4 rounded ${message.includes('Error') || message.includes('❌') || message.includes('⚠️') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Subcategory Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Subcategory / Brand Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
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
              <label className="block text-sm font-semibold text-gray-900 mb-3">Subcategory Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="sub-image-upload"
                />
                <label htmlFor="sub-image-upload" className="cursor-pointer w-full h-full block">
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
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Organize */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Organize</h3>
              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Category <span className="text-red-500">*</span></label>
                  <select
                    value={parentId}
                    onChange={(e) => { setParentId(e.target.value); setParentSubId(""); }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Select Parent Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Group (Optional)</label>
                  <p className="text-[10px] text-gray-400 mb-2">Select this if adding a Brand/Item under a Group (e.g. Samsung under Mobiles)</p>
                  <select
                    value={parentSubId}
                    onChange={(e) => setParentSubId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                    disabled={!parentId || subcategories.length === 0}
                  >
                    <option value="">-- None (Create New Group) --</option>
                    {subcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    placeholder="Slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated from name</p>
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
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Select brands that belong to this subcategory</p>
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
};

export default SubcategoryForm;
