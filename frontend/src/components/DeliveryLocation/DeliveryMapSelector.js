import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { ArrowLeft, MapPin, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to handle map clicks and dragging
function LocationMarker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
        dragend() {
            const center = map.getCenter();
            setPosition([center.lat, center.lng]);
        },
    });

    return position ? <Marker position={position} /> : null;
}

const DeliveryMapSelector = ({ isOpen, onConfirm, onBack }) => {
    const [position, setPosition] = useState([28.6139, 77.2090]); // Default: Delhi
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const mapRef = useRef(null);

    // Get current location on mount
    useEffect(() => {
        if (isOpen && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = [pos.coords.latitude, pos.coords.longitude];
                    setPosition(newPos);
                    reverseGeocode(newPos[0], newPos[1]);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, [isOpen]);

    // Reverse geocode to get address from coordinates using backend proxy
    const reverseGeocode = async (lat, lng) => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/geocoding/reverse`, {
                params: {
                    lat: lat,
                    lon: lng
                }
            });

            if (response.data && response.data.display_name) {
                setAddress(response.data.display_name);
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            setAddress('Unable to fetch address');
        } finally {
            setLoading(false);
        }
    };

    // Update address when position changes
    useEffect(() => {
        if (position) {
            reverseGeocode(position[0], position[1]);
        }
    }, [position]);

    const handleConfirm = () => {
        const locationData = {
            address: address,
            lat: position[0],
            lng: position[1],
            pincode: extractPincode(address),
            city: extractCity(address),
            state: extractState(address)
        };
        onConfirm(locationData);
    };

    const extractPincode = (addr) => {
        const match = addr.match(/\b\d{6}\b/);
        return match ? match[0] : '';
    };

    const extractCity = (addr) => {
        // Simple extraction - can be improved
        const parts = addr.split(',');
        return parts.length > 2 ? parts[parts.length - 3].trim() : '';
    };

    const extractState = (addr) => {
        const parts = addr.split(',');
        return parts.length > 1 ? parts[parts.length - 2].trim() : '';
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = [pos.coords.latitude, pos.coords.longitude];
                    setPosition(newPos);
                    if (mapRef.current) {
                        mapRef.current.flyTo(newPos, 15);
                    }
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Unable to get your location. Please enable location services.');
                    setLoading(false);
                }
            );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1200] bg-white md:hidden flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 flex-1">Choose address on map</h2>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search location"
                        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={position}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    ref={mapRef}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>

                {/* Center Pin Indicator */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none z-[1000]">
                    <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-semibold mb-2 whitespace-nowrap">
                        We will deliver here
                    </div>
                    <div className="flex justify-center">
                        <MapPin size={40} className="text-red-500 drop-shadow-lg" fill="red" />
                    </div>
                </div>

                {/* Current Location Button */}
                <button
                    onClick={handleUseCurrentLocation}
                    className="absolute bottom-32 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-[1000] flex items-center gap-2"
                    disabled={loading}
                >
                    <MapPin size={20} />
                    <span className="text-xs font-semibold pr-1">Use my current location</span>
                </button>
            </div>

            {/* Address Display & Confirm Button */}
            <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
                <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Your location</p>
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader size={16} className="animate-spin" />
                            <span className="text-sm">Getting address...</span>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-900 font-medium leading-relaxed">
                            {address || 'Move the map to select location'}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleConfirm}
                    disabled={!address || loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default DeliveryMapSelector;
