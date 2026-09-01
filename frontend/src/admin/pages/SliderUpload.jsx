import { useState } from "react";
import axios from "axios";
import { toastSuccess, toastError, toastWarning } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Upload } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function SliderUpload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDiscard = () => {
    navigate("/admin/slider/");
  };

  const handleSubmit = async () => {
    if (!image) return toastWarning("Please select an image");

    setLoading(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("image", image);

    try {
      await axios.post(`${API_BASE_URL}/slider`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toastSuccess("Slider uploaded successfully");
      setTimeout(() => navigate("/admin/slider/"), 1500);
    } catch (err) {
      console.error(err);
      toastError("Failed to upload slider");
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
              <span className="hover:text-[#dc3545] cursor-pointer" onClick={() => navigate("/admin/slider/")}>Sliders</span>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">Add a slider</span>
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
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-[#dc3545] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload Slider"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Slider Title</label>
              <input
                type="text"
                placeholder="Enter slider title (optional)"
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2">This title is optional and for internal reference</p>
            </div>

            {/* Image Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">Slider Image</label>

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setPreview(null);
                      document.getElementById("slider-file-input").value = "";
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <input
                    id="slider-file-input"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <label htmlFor="slider-file-input" className="cursor-pointer w-full h-full block">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-blue-50 p-3 rounded-full">
                        <Upload size={24} className="text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Publishing</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span className="text-gray-900 font-medium">Ready to upload</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Image</span>
                  <span className={`font-medium ${image ? 'text-green-600' : 'text-red-600'}`}>
                    {image ? 'Selected' : 'Required'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Use high-quality images (1920x600px recommended)</li>
                <li>• Keep file size under 2MB for faster loading</li>
                <li>• Use descriptive titles for easy management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
