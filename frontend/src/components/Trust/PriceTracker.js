import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const PriceTracker = ({ productId, currentPrice }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;

        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/products/${productId}/price-history`);
                const formattedData = res.data.map(item => ({
                    price: parseFloat(item.price),
                    date: new Date(item.recorded_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric'
                    }),
                    fullDate: new Date(item.recorded_at).toLocaleDateString('en-IN')
                }));

                // Add current price as the last point if it's different
                if (formattedData.length > 0 && formattedData[formattedData.length - 1].price !== currentPrice) {
                    formattedData.push({
                        price: currentPrice,
                        date: 'Now',
                        fullDate: new Date().toLocaleDateString('en-IN')
                    });
                }

                setData(formattedData);
            } catch (err) {
                console.error("Failed to fetch price history", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [productId, currentPrice]);

    if (loading) return (
        <div className="h-32 flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">
            <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Analyzing Price Trends...</span>
        </div>
    );

    if (data.length < 2) return null;

    const minPrice = Math.min(...data.map(d => d.price));
    const maxPrice = Math.max(...data.map(d => d.price));
    const latestPrice = data[data.length - 1].price;
    const isLowest = latestPrice <= minPrice;

    return (
        <div className="overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                        Price Tracker
                        {isLowest && (
                            <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                                Best Price Ever!
                            </span>
                        )}
                    </h3>
                    <p className="text-[10px] font-medium text-gray-400">Fluctuations over the last few months</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${latestPrice < maxPrice ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                        {latestPrice < maxPrice ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                    </div>
                </div>
            </div>

            <div className="h-44 w-full -ml-6">
                <ResponsiveContainer width="110%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis hide domain={[minPrice * 0.9, maxPrice * 1.1]} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                {payload[0].payload.fullDate}
                                            </p>
                                            <p className="text-sm font-black text-gray-900 leading-none">
                                                {formatPrice(payload[0].value)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#2563eb"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-gray-200"></span>
                    Highest: {formatPrice(maxPrice)}
                </div>
                <div className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Lowest: {formatPrice(minPrice)}
                </div>
            </div>
        </div>
    );
};

export default PriceTracker;
