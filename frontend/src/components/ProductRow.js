import React from 'react';
import Slider from 'react-slick';
import { Link } from 'react-router-dom';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from './ProductCard';

// Custom Arrows with stable positioning and disabled states
function NextArrow(props) {
    const { onClick, className } = props;
    const isDisabled = className && className.includes("slick-disabled");
    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white square-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}
            aria-label="Next"
        >
            <ChevronRight className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`} />
        </button>
    );
}

function PrevArrow(props) {
    const { onClick, className } = props;
    const isDisabled = className && className.includes("slick-disabled");
    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white square-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}`}
            aria-label="Previous"
        >
            <ChevronLeft className={`w-5 h-5 ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`} />
        </button>
    );
}

const ProductRow = ({ title, products = [], linkTo = "/search" }) => {
    const settings = {
        dots: false,
        infinite: false,
        speed: 500,
        slidesToShow: 5,
        slidesToScroll: 5,
        initialSlide: 0,
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        responsive: [
            {
                breakpoint: 1536,
                settings: {
                    slidesToShow: 5,
                    slidesToScroll: 2
                }
            },
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: 4,
                    slidesToScroll: 2
                }
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    arrows: true
                }
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1.5,
                    slidesToScroll: 1,
                    arrows: true,
                    dots: false
                }
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1.2,
                    slidesToScroll: 1,
                    arrows: true,
                    dots: false
                }
            }
        ]
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="my-3 bg-white shadow-sm rounded-sm p-4 relative">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                <Link to={linkTo} className="bg-brand-orange text-white text-xs font-bold px-4 py-2 rounded-sm uppercase shadow-sm hover:bg-brand-orange-hover transition">
                    View All
                </Link>
            </div>

            <div className="px-1 md:px-2 product-row-slider">
                <Slider {...settings}>
                    {products.map(product => (
                        <div key={product.id} className="px-1 md:px-2 h-full !flex flex-col">
                            <ProductCard product={product} section={title?.toLowerCase().replace(/\s+/g, '_')} />
                        </div>
                    ))}
                </Slider>
            </div>
        </div>
    );
};

export default ProductRow;
