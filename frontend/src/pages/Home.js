import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Banner from '../components/Banner';
import VideoFeed from '../components/VideoFeed/VideoFeed';
import useRecentlyViewed from '../hooks/useRecentlyViewed';
import ProductRow from '../components/ProductRow';
import PromoSection from '../components/PromoSection';
import HomeHighlights from '../components/HomeHighlights';
import PriceHuntWidget from '../components/PriceHuntWidget';
import ProductCard from '../components/ProductCard';
import { FlipkartLoader } from '../components/Loader/Loader';
import NearbyShops from '../components/NearbyShops';
import useLocation from '../hooks/useLocation';
import Pagination from '../components/Pagination';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Home = () => {
  const { lat, lng, loading: locLoading } = useLocation();
  const [bestSellers, setBestSellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);

  const { recentlyViewedIds } = useRecentlyViewed();

  // Pagination State for Explore More
  const [exploreProducts, setExploreProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const productsPerPage = 24;

  // Fetch initial segments
  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const geoQuery = (lat && lng) ? `&lat=${lat}&lng=${lng}` : '';
        const [resBest, resNew, resTrend, resFeat, resTop] = await Promise.all([
          fetch(`${API_BASE_URL}/products?tags=best_seller&limit=10${geoQuery}`),
          fetch(`${API_BASE_URL}/products?tags=new_arrival&limit=10${geoQuery}`),
          fetch(`${API_BASE_URL}/products?tags=trending&limit=10${geoQuery}`),
          fetch(`${API_BASE_URL}/products?tags=featured&limit=10${geoQuery}`),
          fetch(`${API_BASE_URL}/products?tags=top_rated&limit=10${geoQuery}`)
        ]);

        const dataBest = await resBest.json();
        const dataNew = await resNew.json();
        const dataTrend = await resTrend.json();
        const dataFeat = await resFeat.json();
        const dataTop = await resTop.json();

        setBestSellers(Array.isArray(dataBest) ? dataBest : (dataBest.products || []));
        setNewArrivals(Array.isArray(dataNew) ? dataNew : (dataNew.products || []));
        setTrending(Array.isArray(dataTrend) ? dataTrend : (dataTrend.products || []));
        setFeatured(Array.isArray(dataFeat) ? dataFeat : (dataFeat.products || []));
        setTopRated(Array.isArray(dataTop) ? dataTop : (dataTop.products || []));
      } catch (err) {
        console.error("Error fetching product segments:", err);
      }
    };

    if (!locLoading) {
      fetchSegments();
    }
  }, [lat, lng, locLoading]);

  // Fetch products for Explore More with pagination
  useEffect(() => {
    const fetchExploreProducts = async () => {
      setLoadingMore(true);
      const minLoadTime = 500;
      const startTime = Date.now();

      try {
        const geoQuery = (lat && lng) ? `&lat=${lat}&lng=${lng}` : '';
        const res = await fetch(`${API_BASE_URL}/products?page=${currentPage}&limit=${productsPerPage}${geoQuery}`);
        const data = await res.json();

        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
        }

        const products = Array.isArray(data) ? data : (data.products || []);
        setExploreProducts(products);

        // Update total pages from pagination metadata
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        } else {
          // Fallback: estimate based on products returned
          setTotalPages(products.length < productsPerPage ? currentPage : currentPage + 1);
        }
      } catch (err) {
        console.error("Error fetching explore products:", err);
      } finally {
        setLoadingMore(false);
      }
    };

    if (!locLoading) {
      fetchExploreProducts();
    }
  }, [currentPage, lat, lng, locLoading, productsPerPage]);

  useEffect(() => {
    if (recentlyViewedIds.length > 0) {
      const geoQuery = (lat && lng) ? `&lat=${lat}&lng=${lng}` : '';
      axios.get(`${API_BASE_URL}/products?ids=${recentlyViewedIds.join(',')}${geoQuery}`)
        .then(res => {
          const sorted = recentlyViewedIds.map(id => (res.data.products || []).find(p => p.id === id)).filter(Boolean);
          setRecentProducts(sorted);
        })
        .catch(err => console.error("Failed to fetch recent products", err));
    }
  }, [recentlyViewedIds, lat, lng]);

  const [showVideoFeed, setShowVideoFeed] = useState(false);

  return (
    <div className="home bg-[#f1f3f6] min-h-screen pb-10 relative">
      <div className="pt-4 md:pt-0 px-2">
        <Banner />
      </div>

      {/* Video Discovery Button (Floating) */}
      <button
        onClick={() => setShowVideoFeed(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#dc3545] to-orange-500 text-white px-5 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all animate-bounce"
      >
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="font-bold tracking-tight">Watch & Shop</span>
      </button>

      {showVideoFeed && <VideoFeed onClose={() => setShowVideoFeed(false)} />}

      <div className="mx-auto px-2">
        <NearbyShops />
      </div>

      <div className="mx-auto px-2">
        <PromoSection />
      </div>

      <div className="mx-auto px-2">
        <HomeHighlights />
      </div>

      <div className="mx-auto px-2">
        <PriceHuntWidget />
      </div>

      <div className="mx-auto px-2">
        {bestSellers.length > 0 && (
          <ProductRow title="Best Sellers" products={bestSellers} linkTo="/search?tags=best_seller" />
        )}

        {newArrivals.length > 0 && (
          <ProductRow title="New Arrivals" products={newArrivals} linkTo="/search?tags=new_arrival" />
        )}

        {trending.length > 0 && (
          <ProductRow title="Trending Now" products={trending} linkTo="/search?tags=trending" />
        )}

        {featured.length > 0 && (
          <ProductRow title="Featured Brands" products={featured} linkTo="/search?tags=featured" />
        )}

        {topRated.length > 0 && (
          <ProductRow title="Top Rated" products={topRated} linkTo="/search?tags=top_rated" />
        )}

        {recentProducts.length > 0 && (
          <div className="mt-4">
            <ProductRow title="Recently Viewed Products" products={recentProducts} />
          </div>
        )}

        {/* Explore More Section with Pagination */}
        <div className="mt-8 mb-4">
          <h2 id="explore-more-section" className="text-xl font-bold text-gray-800 mb-6 px-4">Explore More</h2>

          {loadingMore ? (
            <div className="flex justify-center py-20 flex-col items-center gap-2">
              <FlipkartLoader />
              <span className="text-[#2874f0] font-medium text-sm">Loading products...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 px-2">
                {exploreProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {exploreProducts.length === 0 && (
                <div className="text-center py-20 text-gray-500 font-medium">
                  No products found.
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(newPage) => {
                    setCurrentPage(newPage);
                    // Scroll to Explore More section instead of page top
                    const exploreSection = document.getElementById('explore-more-section');
                    if (exploreSection) {
                      exploreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
