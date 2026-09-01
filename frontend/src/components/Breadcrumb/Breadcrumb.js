import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Breadcrumb = ({ items }) => {
    return (
        <div className="bg-white px-4 py-3 shadow-sm">
            <div className="max-w-[1248px] mx-auto flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                        {item.href ? (
                            <Link
                                to={item.href}
                                className="hover:text-blue-600 transition-colors whitespace-nowrap font-medium"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-900 font-semibold truncate">{item.label}</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default Breadcrumb;
