import React from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Tooltip } from 'react-tooltip';

// Using a reliable World TopoJSON source
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const STATE_COORDINATES = {
    // India
    "KARNATAKA": [75.7139, 15.3173],
    "UTTAR PRADESH": [80.3290, 26.8467],
    "MAHARASHTRA": [75.7139, 19.7515],
    "DELHI": [77.1025, 28.7041],
    "NEW DELHI": [77.1025, 28.7041],
    "TAMIL NADU": [78.6569, 11.1271],
    "WEST BENGAL": [87.8550, 22.9868],
    "GUJARAT": [71.1924, 22.2587],
    "RAJASTHAN": [74.2179, 27.0238],
    "TELANGANA": [79.0193, 18.1124],
    "ANDHRA PRADESH": [79.7400, 15.9129],
    "KERALA": [76.2711, 10.8505],
    "MADHYA PRADESH": [78.6569, 22.9734],
    "BIHAR": [85.3131, 25.0961],
    "PUNJAB": [75.3412, 31.1471],
    "HARYANA": [76.0856, 29.0588],
    "ODISHA": [85.0985, 20.9517],
    "JHARKHAND": [85.3131, 23.6102],
    "CHHATTISGARH": [81.8661, 21.2787],
    "ASSAM": [92.9376, 26.2006],
    "JAMMU AND KASHMIR": [74.7973, 33.7782],
    "UTTARAKHAND": [79.0193, 30.0668],
    "HIMACHAL PRADESH": [77.1734, 31.1048],
    "TRIPURA": [91.2868, 23.9408],
    "MEGHALAYA": [91.3662, 25.4670],
    "MANIPUR": [93.9063, 24.6637],
    "NAGALAND": [94.5624, 26.1584],
    "GOA": [74.1240, 15.2993],
    "ARUNACHAL PRADESH": [94.7278, 28.2180],
    "MIZORAM": [93.1396, 23.1645],
    "SIKKIM": [88.5122, 27.5330],
    // Common International (if needed users can add more)
    "CALIFORNIA": [-119.4179, 36.7783],
    "NEW YORK": [-74.0060, 40.7128],
    "LONDON": [-0.1276, 51.5074],
    "DUBAI": [55.2708, 25.2048]
};

const GeoMap = ({ data }) => {
    // data is expected to be array of objects: { state: "Name", orders: 10, revenue: 5000 }

    // 1. Prepare Markers
    const markers = (data || []).map(item => {
        const stateKey = (item.state || "").toUpperCase().trim();
        const coords = STATE_COORDINATES[stateKey];
        if (coords) {
            return {
                name: item.state,
                coordinates: coords,
                orders: item.orders || 0,
                revenue: item.revenue || 0
            };
        }
        return null;
    }).filter(Boolean);

    // 2. Define sizing scale
    const maxRevenue = markers.length > 0 ? Math.max(...markers.map(m => m.revenue)) : 1000;

    const sizeScale = scaleLinear()
        .domain([0, maxRevenue])
        .range([5, 25]); // Bubbles between 5px and 25px radius

    return (
        <div className="w-full h-[500px] bg-slate-50 rounded-lg overflow-hidden border border-gray-100 flex flex-col items-center justify-center relative">
            {markers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <p className="text-gray-400 bg-white/80 px-4 py-2 rounded">No geographic data available to map</p>
                </div>
            )}

            <ComposableMap projectionConfig={{ scale: 600, center: [78, 22] }} style={{ width: "100%", height: "100%" }}>
                <ZoomableGroup>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#EAEAEC"
                                    stroke="#D6D6DA"
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#F5F5F5", outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {markers.map(({ name, coordinates, orders, revenue }, i) => (
                        <Marker key={`${name}-${i}`} coordinates={coordinates} data-tooltip-id="geo-tooltip" data-tooltip-content={`${name}: ₹${revenue.toLocaleString()} (${orders} Orders)`}>
                            <circle
                                r={sizeScale(revenue)}
                                fill="#FB641B"
                                stroke="#FFFFFF"
                                strokeWidth={2}
                                style={{
                                    filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                className="hover:opacity-80 hover:scale-110"
                            />
                        </Marker>
                    ))}
                </ZoomableGroup>
            </ComposableMap>
            <Tooltip
                id="geo-tooltip"
                style={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "8px",
                    fontWeight: "500",
                    zIndex: 999
                }}
            />
        </div>
    );
};

export default GeoMap;
