import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { toastError, axiosErrorMessage } from '../../utils/toast';
import { Search, ChevronDown, RefreshCw } from "lucide-react";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const HeatmapExplorer = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [urls, setUrls] = useState([]);
    const [selectedUrl, setSelectedUrl] = useState('');
    const [points, setPoints] = useState([]);
    const [activePoint, setActivePoint] = useState(null);
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const fetchUrls = useCallback(async () => {
        try {
            console.log("Fetching heatmap URLs from:", `${API_BASE_URL}/api/events/heatmap/urls`);
            const res = await axios.get(`${API_BASE_URL}/api/events/heatmap/urls`, {
                withCredentials: true
            });
            console.log("Heatmap URLs response:", res);
            if (res.data && Array.isArray(res.data)) {
                setUrls(res.data);
                if (res.data.length > 0) {
                    setSelectedUrl(res.data[0].page_url);
                }
            } else {
                console.error("Heatmap URLs response is not an array:", res.data);
            }
        } catch (err) {
            console.error("Heatmap URL fetch error details:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                config: err.config
            });
            toastError(axiosErrorMessage(err));
            // Connectivity check
            axios.get(`${API_BASE_URL}/api/events/test`)
                .then(r => console.log("Connectivity test:", r.data))
                .catch(e => console.error("Connectivity test FAILED:", e.message));
        }
    }, []);

    useEffect(() => {
        fetchUrls();
    }, [fetchUrls]);

    const fetchHeatmapData = useCallback(async () => {
        if (!selectedUrl) return;
        setLoading(true);
        setActivePoint(null); // Reset selection on new load
        try {
            const res = await axios.get(`${API_BASE_URL}/api/events/heatmap?page_url=${encodeURIComponent(selectedUrl)}`, {
                withCredentials: true
            });
            setPoints(res.data);
        } catch (err) {
            console.error("Heatmap data fetch error:", err);
            toastError("Failed to fetch heatmap coordinates");
        } finally {
            setLoading(false);
        }
    }, [selectedUrl]);

    useEffect(() => {
        if (selectedUrl) fetchHeatmapData();
    }, [selectedUrl, fetchHeatmapData]);

    // Draw Heatmap overlay
    const drawHeatmap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = containerRef.current.offsetWidth;
        const clickMaxY = points.length > 0 ? Math.max(...points.map(p => p.y)) : 0;
        const height = Math.max(800, clickMaxY + 100);

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw "Glow" for each point
        points.forEach(p => {
            const x = p.x;
            const y = p.y;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Add "Hot" centers (Yellow dots)
        points.forEach(p => {
            ctx.fillStyle = (activePoint && activePoint.x === p.x && activePoint.y === p.y) ? '#3b82f6' : 'rgba(255, 255, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, (activePoint && activePoint.x === p.x && activePoint.y === p.y) ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();

            if (activePoint && activePoint.x === p.x && activePoint.y === p.y) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }, [points, activePoint]);

    useEffect(() => {
        if (points.length > 0 && canvasRef.current) {
            drawHeatmap();
        }
    }, [points, activePoint, drawHeatmap]); // Re-draw when activePoint changes

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredUrls = urls.filter(u =>
        u.page_url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Find closest point within 10px radius
        const closestPoint = points.find(p => {
            const distance = Math.sqrt(Math.pow(p.x - mouseX, 2) + Math.pow(p.y - mouseY, 2));
            return distance < 10;
        });

        setActivePoint(closestPoint || null);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">Visual Heatmap Explorer</h1>
                    <p className="text-xs md:text-sm text-gray-500">Analyze user interaction "Hotspots" across your site</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Custom Searchable Select */}
                    <div className="relative w-full md:w-80" ref={dropdownRef}>
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between p-2.5 border rounded-lg bg-white shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
                        >
                            <span className="text-sm text-gray-700 truncate mr-2">
                                {selectedUrl || "Select a URL to analyze..."}
                            </span>
                            <ChevronDown size={16} className="text-gray-400" />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl z-50 max-h-80 flex flex-col">
                                <div className="p-2 border-b sticky top-0 bg-white rounded-t-lg">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search Page URL..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 p-1">
                                    {filteredUrls.length > 0 ? (
                                        filteredUrls.map(u => (
                                            <div
                                                key={u.page_url}
                                                onClick={() => {
                                                    setSelectedUrl(u.page_url);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`p-2 rounded text-xs cursor-pointer flex justify-between items-center ${selectedUrl === u.page_url ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                                            >
                                                <span className="truncate flex-1 mr-2">{u.page_url}</span>
                                                <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">{u.count} events</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-gray-400 italic">
                                            No matching URLs found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={fetchHeatmapData}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm active:transform active:scale-95 whitespace-nowrap"
                    >
                        <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh Data</span>
                        <span className="sm:hidden">Refresh</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Visual Legend */}
                <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500 opacity-40 blur-[2px]"></div>
                        <span className="text-xs text-gray-600 font-medium">Low Interaction</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-600 opacity-80 shadow-[0_0_8px_red]"></div>
                        <span className="text-xs text-gray-600 font-medium">High Interaction</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <span className="text-xs text-gray-600 font-medium">Click Origin</span>
                    </div>
                </div>

                {/* Main Viewport */}
                <div
                    ref={containerRef}
                    className="relative bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden min-h-[800px] shadow-inner"
                >
                    {loading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white bg-opacity-80">
                            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-sm font-medium text-gray-600">Generating Heatmap Overlay...</p>
                        </div>
                    )}

                    {/* Background "Ghost" Website Preview */}
                    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none flex items-center justify-center font-bold text-4xl text-gray-200 uppercase tracking-widest">
                        {selectedUrl} Preview
                    </div>

                    <canvas
                        ref={canvasRef}
                        onClick={handleCanvasClick}
                        className="absolute inset-0 z-10 w-full cursor-crosshair"
                    />

                    {/* Event Details Tooltip */}
                    {activePoint && (
                        <div
                            className="absolute z-30 bg-white shadow-xl rounded-lg border border-gray-200 p-4 w-72 pointer-events-none"
                            style={{
                                left: `${activePoint.x + 15}px`,
                                top: `${activePoint.y + 15}px`,
                                transform: activePoint.x > containerRef.current.offsetWidth / 2 ? 'translateX(-100%)' : ''
                            }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Event Details</span>
                                <span className="text-[10px] text-gray-400">{new Date(activePoint.created_at).toLocaleString()}</span>
                            </div>
                            <h5 className="text-sm font-bold text-gray-800 mb-1">{activePoint.event_name}</h5>
                            <div className="bg-gray-50 p-2 rounded text-[10px] font-mono text-gray-600 break-all border border-gray-100">
                                {activePoint.selector}
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Absolute: {Math.round(activePoint.x)}px, {Math.round(activePoint.y)}px
                            </div>
                        </div>
                    )}

                    {points.length === 0 && !loading && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">
                            No click data available for this path.
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
                <div className="text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Developer Tip:</strong> This heatmap utilizes the raw <code>x, y</code> coordinates captured by the <code>AutoTracker</code>.
                    It helps identify dead-zones where users might be dropping off or clicking non-interactive elements.
                </p>
            </div>
        </div>
    );
};

export default HeatmapExplorer;
