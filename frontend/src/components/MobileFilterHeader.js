import React from 'react';
import { ListFilter, ArrowUpDown } from 'lucide-react';

const MobileFilterHeader = ({
    onSortClick,
    onFilterClick,
    quickFilters = [],
    activeSort
}) => {
    return (
        <div className="sticky top-[108px] z-30 bg-white border-b border-gray-100 md:hidden">
            {/* Main Sort/Filter Bar */}
            <div className="flex divide-x divide-gray-200">
                <button
                    onClick={onSortClick}
                    className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                    <ArrowUpDown size={18} className="text-gray-600" />
                    <span className="text-sm font-bold text-gray-800">Sort</span>
                    {activeSort && activeSort !== 'popularity' && (
                        <div className="w-1.5 h-1.5 bg-brand-orange rounded-full"></div>
                    )}
                </button>
                <button
                    onClick={onFilterClick}
                    className="flex-1 py-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                    <ListFilter size={18} className="text-gray-600" />
                    <span className="text-sm font-bold text-gray-800">Filter</span>
                </button>
            </div>

            {/* Quick Filters - Horizontal Scroll */}
            <div className="flex items-center gap-3 px-3 py-3 overflow-x-auto no-scrollbar border-t border-gray-50">
                {quickFilters.map((filter, idx) => (
                    <button
                        key={idx}
                        onClick={filter.onClick}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border min-w-fit transition-all duration-200 ${filter.isActive
                                ? 'border-brand-orange bg-orange-50 text-brand-orange font-medium'
                                : 'border-gray-200 bg-white text-gray-700 shadow-sm'
                            }`}
                    >
                        {filter.icon}
                        <span className="text-[13px] whitespace-nowrap">{filter.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MobileFilterHeader;
