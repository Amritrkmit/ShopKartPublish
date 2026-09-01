import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import { useDeliveryLocation } from '../../context/DeliveryLocationContext';

const DeliveryLocationBanner = ({ onClick }) => {
    const { selectedLocation, isLocationSet } = useDeliveryLocation();

    const truncateAddress = (address) => {
        if (!address) return '';
        const maxLength = 35;
        return address.length > maxLength ? address.substring(0, maxLength) + '...' : address;
    };

    return (
        <div
            onClick={onClick}
            className="block md:hidden sticky top-[64px] z-[999] bg-gradient-to-r from-[#1a4d2e] to-[#2d6a4f] text-white px-4 py-3 cursor-pointer hover:from-[#153f25] hover:to-[#25583f] transition-all duration-200 shadow-md"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin size={20} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        {isLocationSet && selectedLocation ? (
                            <div className="flex flex-col">
                                <span className="text-xs text-green-200">Deliver to</span>
                                <span className="text-sm font-semibold truncate">
                                    {truncateAddress(selectedLocation.address)}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Location not set</span>
                                <span className="text-green-300 text-sm font-semibold">Select delivery location</span>
                            </div>
                        )}
                    </div>
                </div>
                <ChevronRight size={18} className="flex-shrink-0 text-green-200" />
            </div>
        </div>
    );
};

export default DeliveryLocationBanner;
