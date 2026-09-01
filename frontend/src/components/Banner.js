import { useEffect, useState } from "react";
import Slider from 'react-slick';
import axios from "axios";
import './Banner.css';

// Import slick-carousel CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;


function NextArrow(props) {
  const { onClick } = props;
  return (
    <div className="custom-arrow next-arrow" onClick={onClick}>
      &#8250;
    </div>
  );
}

// Custom Prev Arrow
function PrevArrow(props) {
  const { onClick } = props;
  return (
    <div className="custom-arrow prev-arrow" onClick={onClick}>
      &#8249;
    </div>
  );
}

const Banner = () => {
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    // Fetch slider data from backend
    axios.get(`${API_BASE_URL}/slider`)
      .then(res => {
        setSlides(res.data); // Assuming backend returns [{id, title, image}]
      })
      .catch(err => console.error("Error fetching slider data:", err));
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 3000,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    lazyLoad: 'progressive',
    pauseOnHover: false, // Must be false for animation continuity
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    customPaging: i => (
      <div className="custom-dot">
        <div className="dot-progress"></div>
      </div>
    ),
    appendDots: dots => (
      <div style={{ bottom: "10px" }}>
        <ul style={{ margin: "0px", padding: "0px", display: "flex", justifyContent: "center", gap: "8px" }}> {dots} </ul>
      </div>
    )
  };

  if (slides.length === 0) {
    return <p className="text-center py-10">Loading slider...</p>;
  }

  return (
    <div className="banner-slider">
      <Slider {...settings}>
        {slides.map(slide => (
          <div key={slide.id} className="relative">
            <img
              src={`${API_BASE_URL}${slide.image}`}
              alt={slide.title}
              className="w-full h-auto min-h-[150px] object-cover md:object-fill"
            />
            {slide.title && (
              <div className="slider-caption absolute bottom-2 left-2 md:bottom-4 md:left-4 text-white text-xs md:text-lg bg-black bg-opacity-50 px-2 py-1 md:px-3 md:py-1 rounded max-w-[80%] truncate">
                {slide.title}
              </div>
            )}
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Banner;
