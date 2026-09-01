import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function HomeHighlights() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/collections`);
                setCollections(res.data);
            } catch (err) {
                console.error("Failed to fetch collections", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, []);

    if (loading || collections.length === 0) return null;

    return (
        <div className="mx-auto px-2 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {collections.map((col) => {
                    if (col.type === "grid") {
                        return <GridCollection key={col.id} collection={col} />;
                    } else {
                        return <FeatureCollection key={col.id} collection={col} />;
                    }
                })}
            </div>
        </div>
    );
}

function GridCollection({ collection }) {
    // Ensure we have exactly 4 items for a clean 2x2 grid, or fill up to 4
    const items = collection.items.slice(0, 4);

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 h-10">
                <h2 className="text-xl font-bold text-gray-800 line-clamp-1">{collection.title}</h2>
                {collection.link_url && (
                    <Link to={collection.link_url} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors flex-shrink-0">
                        <ChevronRight size={18} />
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
                {items.map((item) => (
                    <Link key={item.id} to={item.link_url || "#"} className="flex flex-col group">
                        <div className="aspect-square bg-gray-50 rounded-lg p-2 mb-2 flex items-center justify-center overflow-hidden border border-gray-50 transition-colors group-hover:border-gray-200">
                            <img
                                src={`${API_BASE_URL}${item.image_url}`}
                                alt={item.title}
                                className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                        <p className="text-sm font-medium text-gray-700 line-clamp-1">{item.title}</p>
                        <p className="text-xs font-bold text-green-600">{item.offer_text}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function FeatureCollection({ collection }) {
    const mainText = collection.items[0] || {};
    const images = collection.items.slice(0, 3);

    return (
        <div className="bg-[#fef9f1] rounded-xl p-6 shadow-sm border border-[#faebd7] flex flex-col h-full">
            <div className="mb-6 h-auto min-h-[120px]">
                <h2 className="text-2xl font-bold text-[#5c4033] leading-tight mb-2 line-clamp-2">
                    {mainText.title || collection.title}
                </h2>
                <p className="text-[#8b7355] text-sm font-medium leading-relaxed max-w-[95%] line-clamp-3">
                    {mainText.subtitle}
                </p>
            </div>

            <div className="flex items-center gap-2 mb-8 mt-auto">
                {images.map((item, idx) => (
                    <div key={item.id} className="flex-1 aspect-[4/5] bg-white rounded-lg overflow-hidden p-1 shadow-sm border border-gray-100">
                        <img
                            src={`${API_BASE_URL}${item.image_url}`}
                            alt=""
                            className="w-full h-full object-contain"
                        />
                    </div>
                ))}
                {/* Placeholder if less than 3 images to maintain the look */}
                {[...Array(Math.max(0, 3 - images.length))].map((_, i) => (
                    <div key={`empty-${i}`} className="flex-1 aspect-[4/5] bg-white/20 rounded-lg border border-white/10 hidden sm:block"></div>
                ))}
            </div>

            <div className="mt-auto">
                <Link
                    to={collection.link_url || "#"}
                    className="inline-flex items-center gap-2 text-[#b8860b] font-bold transition-transform hover:translate-x-1"
                >
                    <span className="bg-[#faebd7] px-4 py-2 rounded-lg text-sm drop-shadow-sm flex items-center gap-1">
                        See Collection <ChevronRight size={16} />
                    </span>
                </Link>
            </div>
        </div>
    );
}
