import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { X, BarChart2 } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CompareBar = () => {
    const { compareList, toggleCompare, clearCompare } = useCompare();
    const [products, setProducts] = useState([]);
    const location = useLocation();

    useEffect(() => {
        const fetchDetails = async () => {
            if (compareList.length === 0) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/api/products?ids=${compareList.join(',')}`);
                setProducts(res.data.products || []);
            } catch (err) {
                console.error("Failed to fetch compare bar products", err);
            }
        };
        fetchDetails();
    }, [compareList]);

    // Hide on compare page itself or if list is empty
    if (location.pathname.startsWith('/compare') || compareList.length === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t shadow-[0_-5px_25px_rgba(0,0,0,0.15)] py-3 px-4 md:px-10 flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-300 backdrop-blur-sm bg-white/90">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar max-w-[calc(100%-150px)]">
                {compareList.map(id => {
                    const product = products.find(p => p.id === id);
                    return (
                        <div key={id} className="relative flex-shrink-0">
                            <div className={`w-14 h-14 md:w-16 md:h-16 border rounded bg-white flex items-center justify-center p-1 group transition-all duration-300 ${!product ? 'animate-pulse bg-gray-50' : 'hover:shadow-md'}`}>
                                {product ? (
                                    <img src={`${API_BASE_URL}${product.image}`} alt={product.name} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 opacity-20">
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin"></div>
                                    </div>
                                )}
                                <button
                                    onClick={() => toggleCompare(id)}
                                    className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white rounded-full p-1 hover:bg-black transition-colors shadow-md z-10"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {compareList.length < 4 && Array.from({ length: 4 - compareList.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-14 h-14 md:w-16 md:h-16 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-200 transition-colors hover:border-blue-200 hover:text-blue-200">
                        <BarChart2 size={24} className="opacity-40" />
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 flex-shrink-0">
                <button
                    onClick={clearCompare}
                    className="text-[10px] md:text-xs font-bold text-gray-400 hover:text-red-600 uppercase tracking-widest transition-colors px-2"
                >
                    Clear All
                </button>
                <Link
                    to={`/compare/?ids=${compareList.join(',')}`}
                    className="bg-blue-600 text-white px-6 md:px-10 py-2.5 md:py-3.5 rounded-sm text-xs md:text-sm font-black uppercase tracking-widest shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] transition-all transform hover:-translate-y-0.5 flex items-center gap-3 active:scale-95"
                >
                    COMPARE <span className="bg-white/20 px-2 py-0.5 rounded-sm text-[10px] md:text-xs">{compareList.length}</span>
                </Link>
            </div>
        </div>
    );
};

export default CompareBar;
