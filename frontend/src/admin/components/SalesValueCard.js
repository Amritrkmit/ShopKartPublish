import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { formatPrice } from "../../utils/format";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="sales-value-tooltip">
        <p className="tooltip-day">{data.fullDay}</p>
        <p className="tooltip-amount">{formatPrice(data.sales || 0)}</p>
      </div>
    );
  }
  return null;
};

const SalesValueCard = () => {
  const [period, setPeriod] = useState('week');
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    percentageChange: 0,
    graphData: []
  });
  const [loading, setLoading] = useState(true);

  const fetchSalesData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/sales-value?period=${period}`, { withCredentials: true });
      setSalesData(res.data);
    } catch (err) {
      console.error("Failed to fetch sales data", err);
      // Use mock data for demo
      const mockData = generateMockData(period);
      setSalesData(mockData);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Generate mock data for demonstration
  const generateMockData = (period) => {
    if (period === 'week') {
      return {
        totalSales: 10567,
        percentageChange: 10.57,
        graphData: [
          { day: 'Mon', fullDay: 'Monday', sales: 1200 },
          { day: 'Tue', fullDay: 'Tuesday', sales: 1850 },
          { day: 'Wed', fullDay: 'Wednesday', sales: 1800 },
          { day: 'Thu', fullDay: 'Thursday', sales: 2100 },
          { day: 'Fri', fullDay: 'Friday', sales: 2050 },
          { day: 'Sat', fullDay: 'Saturday', sales: 2400 },
          { day: 'Sun', fullDay: 'Sunday', sales: 1650 }
        ]
      };
    } else {
      return {
        totalSales: 45890,
        percentageChange: 8.23,
        graphData: [
          { day: 'Week 1', fullDay: 'Week 1', sales: 8500 },
          { day: 'Week 2', fullDay: 'Week 2', sales: 11200 },
          { day: 'Week 3', fullDay: 'Week 3', sales: 12800 },
          { day: 'Week 4', fullDay: 'Week 4', sales: 13390 }
        ]
      };
    }
  };

  const data = salesData.graphData || [];
  const isPositive = salesData.percentageChange >= 0;

  return (
    <div className="sales-value-card">
      {/* Header Section */}
      <div className="sales-value-header">
        <div className="sales-value-info">
          <p className="sales-label">Sales Value</p>
          <h2 className="sales-amount">
            {formatPrice(salesData.totalSales)}
          </h2>
          <p className={`sales-change ${isPositive ? 'positive' : 'negative'}`}>
            Yesterday <span className="change-icon">{isPositive ? '↗' : '↘'}</span> {Math.abs(salesData.percentageChange).toFixed(2)}%
          </p>
        </div>
        <div className="period-toggle">
          <button
            className={`toggle-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            Month
          </button>
          <button
            className={`toggle-btn ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            Week
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="sales-chart">
        {loading ? (
          <div className="chart-loading">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={200} minWidth={0}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              {/* Dashed vertical grid lines */}
              {data.map((_, index) => (
                <line
                  key={index}
                  x1={`${(index / (data.length - 1)) * 100}%`}
                  y1="0%"
                  x2={`${(index / (data.length - 1)) * 100}%`}
                  y2="100%"
                  stroke="#89D4D9"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              ))}
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                dy={15}
              />
              <YAxis hide={true} domain={['dataMin - 200', 'dataMax + 200']} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#1A7A80"
                strokeWidth={2.5}
                dot={{ fill: '#1A7A80', strokeWidth: 3, r: 5, stroke: '#1A7A80' }}
                activeDot={{ r: 7, fill: '#1A7A80', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Styles */}
      <style jsx="true">{`
        .sales-value-card {
          background: linear-gradient(135deg, #B8E8EB 0%, #C5EDF0 50%, #D4F4F6 100%);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(26, 122, 128, 0.1);
        }

        .sales-value-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .sales-value-info {
          display: flex;
          flex-direction: column;
        }

        .sales-label {
          font-size: 14px;
          color: #4A5568;
          font-weight: 500;
          margin: 0;
        }

        .sales-amount {
          font-size: 32px;
          font-weight: 700;
          color: #1A202C;
          margin: 6px 0;
        }

        .sales-change {
          font-size: 13px;
          font-weight: 500;
          margin: 0;
        }

        .sales-change.positive {
          color: #1A7A80;
        }

        .sales-change.negative {
          color: #E53E3E;
        }

        .change-icon {
          margin: 0 2px;
        }

        .period-toggle {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 8px;
          padding: 3px;
        }

        .toggle-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #4A5568;
          background: transparent;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        .toggle-btn.active {
          background: #2D3748;
          color: #fff;
          box-shadow: 0 2px 5px rgba(45, 55, 72, 0.3);
        }

        .sales-chart {
          margin-top: 10px;
        }

        .chart-loading {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4A5568;
        }

        .sales-value-tooltip {
          background: #2D3748;
          padding: 10px 14px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .tooltip-day {
          font-size: 11px;
          color: #A0AEC0;
          margin: 0 0 4px 0;
        }

        .tooltip-amount {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        @media (max-width: 640px) {
          .sales-value-header {
            flex-direction: column;
            gap: 16px;
          }

          .period-toggle {
            align-self: flex-start;
          }

          .sales-amount {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesValueCard;
