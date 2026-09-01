import React from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { staticContent } from './staticContent';
import { ChevronRight, Home } from 'lucide-react';

const StaticPage = () => {
    const { pageId } = useParams();
    const pageData = staticContent[pageId];

    if (!pageData) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-gray-50">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">404 - Page Not Found</h2>
                <p className="text-gray-500 mb-8 max-w-md text-center">
                    The informational page you are looking for doesn't exist or has been moved.
                </p>
                <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg">
                    Back to Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            {pageData.image ? (
                <div className="relative h-[400px] w-full overflow-hidden">
                    <img
                        src={pageData.image}
                        alt={pageData.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 flex flex-col justify-end pb-12">
                        <div className="max-w-[1248px] mx-auto px-4 w-full">
                            <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                                <Link to="/" className="hover:text-white flex items-center gap-1 transition-colors">
                                    <Home size={14} /> Home
                                </Link>
                                <ChevronRight size={14} />
                                <span className="text-white font-medium">{pageData.title}</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                                {pageData.title}
                            </h1>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border-b border-gray-200 py-4 mb-8">
                    <div className="max-w-[1248px] mx-auto px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                                <Home size={14} /> Home
                            </Link>
                            <ChevronRight size={14} />
                            <span className="text-gray-900 font-semibold">{pageData.title}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div className={`max-w-[1000px] mx-auto px-4 pb-20 ${pageData.image ? 'mt-16' : ''}`}>
                {!pageData.image && (
                    <header className="mb-10 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-2">
                            {pageData.title}
                        </h1>
                        <div className="h-1.5 w-24 bg-blue-600 rounded-full mx-auto md:mx-0"></div>
                    </header>
                )}

                {/* Main Content Area */}
                <div
                    className="prose prose-lg max-w-none text-gray-700 leading-relaxed
                        prose-headings:text-gray-900 prose-headings:font-bold 
                        prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
                        prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-3
                        prose-p:mb-6 prose-ul:mb-6 prose-li:mb-2
                        prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pageData.content) }}
                />

                {/* Shared Footer Help */}
                <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">Still have questions?</h4>
                        <p className="text-sm text-gray-500">Our customer support is available 24/7 to help you.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link to="/contact-us/" className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition">
                            Contact Us
                        </Link>
                        <Link to="/help/" className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 transition">
                            Visit Help Center
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaticPage;
