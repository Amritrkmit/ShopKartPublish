import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (!totalPages || totalPages <= 1) return null;

    // Logic for "1,2,3,4,5 ... Last"
    // We'll show a block of 5 pages.
    // Block 1: 1-5. Block 2: 6-10.
    const blockSize = 5;
    const currentBlock = Math.ceil(currentPage / blockSize);
    const startPage = (currentBlock - 1) * blockSize + 1;
    const endPage = Math.min(startPage + blockSize - 1, totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (

        <div className="flex justify-center items-center my-10 gap-2 flex-wrap">


            {/* Previous Button */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 h-10 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Previous Block Ellipsis */}
            {startPage > 1 && (
                <button
                    onClick={() => onPageChange(startPage - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 shadow-sm"
                >
                    ...
                </button>
            )}

            {/* Page Numbers */}
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium border transition-colors shadow-sm ${currentPage === page
                        ? 'bg-[#dc3545] text-white border-[#dc3545]'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    {page}
                </button>
            ))}

            {/* Next Block Ellipsis or Last Page indication */}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && (
                        <button
                            onClick={() => onPageChange(endPage + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 shadow-sm"
                        >
                            ...
                        </button>
                    )}
                    {/* Always show Last Page if not in range */}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm`}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            {/* Next Button */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 h-10 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
            </button>


        </div>
    );
};

export default Pagination;
