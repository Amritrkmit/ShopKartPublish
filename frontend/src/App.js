import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from "react";
import axios from "axios";
import { ToastContainer } from "react-toastify";

import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent/CookieConsent';
import ScriptLoader from './components/ScriptLoader';
import AutoTracker from './components/AutoTracker';
import PopupManager from './components/MarketingPopup/PopupManager';
import AnalyticsTracker from './components/AnalyticsTracker';
import ScrollToTopButton from './components/ScrollToTopButton';
import CompareBar from './components/CompareBar/CompareBar';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { DeliveryLocationProvider } from './context/DeliveryLocationContext';
// AuthProvider moved to index.js
import { PublicRoute, RoleRoute } from './components/AuthRoutes';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const ProductCategory = lazy(() => import('./pages/ProductCategory/ProductCategory'));
const ContactUs = lazy(() => import('./pages/ContactUs/ContactUs'));
const ProductDetails = lazy(() => import('./pages/ProductDetails/ProductDetails'));
const ProductReviewsPage = lazy(() => import('./pages/ProductDetails/ProductReviewsPage'));
const WriteReviewPage = lazy(() => import('./pages/ProductDetails/WriteReviewPage'));
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin"));
const SellerLogin = lazy(() => import("./pages/Auth/SellerLogin"));
const SellerRegister = lazy(() => import("./pages/Auth/SellerRegister"));
const UserLogin = lazy(() => import("./pages/Auth/UserLogin"));
const UserRegister = lazy(() => import("./pages/Auth/UserRegister"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const VerifyOtp = lazy(() => import("./pages/Auth/VerifyOtp"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const DashboardPage = lazy(() => import("./admin/pages/DashboardPage"));
const AdminLayout = lazy(() => import("./admin/layouts/AdminLayout"));
const SliderUpload = lazy(() => import("./admin/pages/SliderUpload"));
const SliderList = lazy(() => import("./admin/pages/Sliders/SliderList"));
const PriceHuntManager = lazy(() => import("./admin/pages/PriceHuntManager"));
const Category = lazy(() => import("./admin/pages/CategoryForm"));
const CategoryList = lazy(() => import("./admin/pages/CategoryList"));
const SubCategory = lazy(() => import("./admin/pages/SubCategoryForm"));
const SubCategoryList = lazy(() => import("./admin/pages/SubCategoryList"));
const ProductUpload = lazy(() => import("./admin/pages/ProductUpload"));
const ProductList = lazy(() => import("./admin/pages/ProductList"));
const CustomizedProducts = lazy(() => import("./admin/pages/CustomizedProducts"));
const CartPage = lazy(() => import("./pages/CartPage/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage/CheckoutPage"));
const CompletePaymentPage = lazy(() => import("./pages/CheckoutPage/CompletePaymentPage"));
const AdminProfile = lazy(() => import("./admin/AdminProfile"));
const Profile = lazy(() => import("./pages/Account/Profile"));
const Addresses = lazy(() => import("./pages/Account/Addresses"));
const Orders = lazy(() => import("./pages/Orders/Orders"));
const OrderDetails = lazy(() => import("./pages/Orders/OrderDetails"));
const DetailsOrderDetails = lazy(() => import("./pages/Orders/DetailsOrderDetails"));
const WishlistPage = lazy(() => import("./pages/Wishlist/WishlistPage"));
const Coupons = lazy(() => import("./pages/Account/Coupons"));
const GiftCards = lazy(() => import("./pages/Account/GiftCards"));
const SavedUPI = lazy(() => import("./pages/Account/SavedUPI"));
const SavedCards = lazy(() => import("./pages/Account/SavedCards"));
const SuperCoins = lazy(() => import("./pages/Account/SuperCoins"));
const MyGroupDeals = lazy(() => import("./pages/Account/MyGroupDeals"));
const MyRewards = lazy(() => import("./pages/Account/MyRewards"));
const Notifications = lazy(() => import("./pages/Account/Notifications"));
const PlusZone = lazy(() => import("./pages/PlusZone/PlusZone"));
const SearchResultsPage = lazy(() => import("./pages/SearchPage/SearchResultsPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage/CategoryPage"));
const ChatPage = lazy(() => import("./pages/Chatbot/ChatPage"));
const SellerBrandManager = lazy(() => import("./pages/Seller/SellerBrandManager"));
const AdminChat = lazy(() => import("./admin/pages/AdminChat"));
const AllOrders = lazy(() => import("./admin/pages/Orders/AllOrders"));
const CustomizedOrders = lazy(() => import("./admin/pages/Orders/CustomizedOrders"));
const OrderDetailsAdmin = lazy(() => import("./admin/pages/Orders/OrderDetailsAdmin"));
const AllUsers = lazy(() => import("./admin/pages/Users/AllUsers"));
const BrandList = lazy(() => import("./admin/pages/BrandList"));
const PromoManager = lazy(() => import("./admin/pages/PromoManager"));
const CollectionManager = lazy(() => import("./admin/pages/CollectionManager"));
const NotFoundPage = lazy(() => import("./pages/404/NotFoundPage"));
const SellerOnboarding = lazy(() => import("./pages/Seller/SellerOnboarding"));
const SellerVerification = lazy(() => import("./admin/pages/SellerVerification"));
const SellerDashboard = lazy(() => import("./pages/Seller/SellerDashboard"));
const SellerProductList = lazy(() => import("./pages/Seller/SellerProductList"));
const SellerProductUpload = lazy(() => import("./pages/Seller/SellerProductUpload"));
const SellerOrders = lazy(() => import("./pages/Seller/SellerOrders"));
const SellerOrderDetails = lazy(() => import("./pages/Seller/SellerOrderDetails"));
const SellerShopProfile = lazy(() => import("./pages/Seller/SellerShopProfile"));
const SellerEarnings = lazy(() => import("./pages/Seller/SellerEarnings"));
const SellerReports = lazy(() => import("./pages/Seller/SellerReports"));
const SellerSupport = lazy(() => import("./pages/Seller/SellerSupport"));
const SellerNotifications = lazy(() => import("./pages/Seller/SellerNotifications"));
const SellerCustomizedProducts = lazy(() => import("./pages/Seller/SellerCustomizedProductList"));
const SellerCustomizedOrders = lazy(() => import("./pages/Seller/SellerCustomizedOrders"));
const ShopsListingPage = lazy(() => import("./pages/ShopsListingPage/ShopsListingPage"));
const ShopPage = lazy(() => import("./pages/ShopPage/ShopPage"));
const AttributeManager = lazy(() => import("./admin/pages/AttributeManager"));
const ScriptManager = lazy(() => import("./admin/pages/ScriptManager"));
const EventExplorer = lazy(() => import("./admin/pages/EventExplorer"));
const ConsentHistory = lazy(() => import("./admin/pages/ConsentHistory"));
const PopupSettings = lazy(() => import("./admin/pages/PopupSettings"));
const CouponManager = lazy(() => import("./admin/pages/CouponManager"));
const Analytics = lazy(() => import("./admin/pages/Analytics"));
const CacheManagement = lazy(() => import("./admin/pages/CacheManagement"));
const SystemHealth = lazy(() => import("./admin/pages/SystemHealth"));
const AlertManager = lazy(() => import("./admin/pages/AlertManager"));
const HeatmapExplorer = lazy(() => import("./admin/pages/HeatmapExplorer"));
const VideoDiscoveryManager = lazy(() => import("./admin/pages/VideoDiscoveryManager"));
const GroupBuyManager = lazy(() => import("./admin/pages/GroupBuyManager"));
const StaticPage = lazy(() => import("./pages/StaticPages/StaticPage"));
const SellerLayout = lazy(() => import("./pages/Seller/components/SellerLayout"));
const SharedCartPage = lazy(() => import("./pages/CartPage/SharedCartPage"));
const Compare = lazy(() => import("./pages/Compare/Compare"));
const HadoopMonitor = lazy(() => import("./admin/pages/HadoopMonitor"));

// New HTML Sitemap Page
const SitemapPage = lazy(() => import("./pages/Sitemap/SitemapPage"));

// Premium Loading Fallback
const PageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999]">
    <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse italic">Optimizing Experience...</p>
  </div>
);

function Layout({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const role = searchParams.get("role");
  const isAuthPage = ["/forgot-password", "/forgot-password/", "/verify-otp", "/verify-otp/", "/reset-password", "/reset-password/"].includes(location.pathname);

  const isDashboardRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/seller") || (isAuthPage && (role === "admin" || role === "seller"));

  return (
    <>
      {!isDashboardRoute && <Header />}
      {children}
      {!isDashboardRoute && <Footer />}
      {!isDashboardRoute && <ScrollToTopButton />}
      {!isDashboardRoute && <CompareBar />}
    </>
  );
}

function App() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (term) => setSearchTerm(term);

  useEffect(() => {
    // Global Axios Interceptor for 401 Unauthorized
    // This handles cases where the token is expired or invalid

    // 1. Request Interceptor: Attach Token & Enable Cookies
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("userToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        config.withCredentials = true; // Always send cookies for hybrid auth
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 2. Response Interceptor: Handle 401s
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const url = error.config.url;
          const isLogin = url.includes('/login');
          const isRegister = url.includes('/register');
          const isVerify = url.includes('/verify-otp');

          if (!isLogin && !isRegister && !isVerify) {
            console.warn("Session unauthorized. Clearing relevant session.");

            if (url.includes('/seller/')) {
              localStorage.removeItem("sellerToken");
            } else if (url.includes('/admin/')) {
              localStorage.removeItem("adminUser");
            } else {
              // Default to user session for other 401s
              localStorage.removeItem("userToken");
            }

            // We don't dispatch logout all anymore, we let Context handle it via refresh or specific events
            // but for now, just removing the token is enough for the next refresh/check.
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  return (
    <Router>
      {/* AuthProvider moved to index.js to wrap CartProvider */}
      <DeliveryLocationProvider>
        <Layout searchTerm={searchTerm} onSearch={handleSearch}>
          <ConfirmationProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Frontend routes */}
                <Route path="/" element={<Home searchTerm={searchTerm} />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/about-us" element={<StaticPage pageId="about-us" />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/sitemap" element={<SitemapPage />} />
                <Route path="/terms" element={<StaticPage pageId="terms" />} />
                <Route path="/privacy" element={<StaticPage pageId="privacy" />} />
                <Route path="/help" element={<StaticPage pageId="help" />} />
                <Route path="/categories" element={<ProductCategory />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/shared-cart/:token" element={<SharedCartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/complete-payments" element={<CompletePaymentPage />} />
                <Route path="/compare" element={<Compare />} />

                {/* User Protected Routes */}
                <Route path="/account/profile" element={<RoleRoute role="user"><Profile /></RoleRoute>} />
                <Route path="/account/orders" element={<RoleRoute role="user"><Orders /></RoleRoute>} />
                <Route path="/account/orders/:id" element={<RoleRoute role="user"><OrderDetails /></RoleRoute>} />
                <Route path="/account/addresses" element={<RoleRoute role="user"><Addresses /></RoleRoute>} />
                <Route path="/account/notifications" element={<RoleRoute role="user"><Notifications /></RoleRoute>} />
                <Route path="/account/coupons" element={<RoleRoute role="user"><Coupons /></RoleRoute>} />
                <Route path="/account/supercoins" element={<RoleRoute role="user"><SuperCoins /></RoleRoute>} />
                <Route path="/account/rewards" element={<RoleRoute role="user"><MyRewards /></RoleRoute>} />
                <Route path="/account/my-deals" element={<RoleRoute role="user"><MyGroupDeals /></RoleRoute>} />
                <Route path="/account/gift-cards" element={<RoleRoute role="user"><GiftCards /></RoleRoute>} />
                <Route path="/account/saved-upi" element={<RoleRoute role="user"><SavedUPI /></RoleRoute>} />
                <Route path="/account/saved-cards" element={<RoleRoute role="user"><SavedCards /></RoleRoute>} />
                <Route path="/wishlist" element={<RoleRoute role="user"><WishlistPage /></RoleRoute>} />
                <Route path="/account/plus-zone" element={<RoleRoute role="user"><PlusZone /></RoleRoute>} />
                <Route path="/plus" element={<RoleRoute role="user"><PlusZone /></RoleRoute>} />
                <Route path="/order_details" element={<RoleRoute role="user"><DetailsOrderDetails /></RoleRoute>} />
                <Route path="/account/*" element={<NotFoundPage />} />


                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:type/:id" element={<ChatPage />} />
                <Route path="/seller-onboarding" element={<SellerOnboarding />} />

                {/* Seller Dashboard Group */}
                <Route
                  path="/seller"
                  element={
                    <RoleRoute role="seller">
                      <SellerLayout />
                    </RoleRoute>
                  }
                >
                  <Route path="dashboard" element={<SellerDashboard />} />
                  <Route path="products" element={<SellerProductList />} />
                  <Route path="products/add" element={<SellerProductUpload />} />
                  <Route path="products/edit/:id" element={<SellerProductUpload />} />
                  <Route path="orders" element={<SellerOrders />} />
                  <Route path="orders/:id" element={<SellerOrderDetails />} />
                  <Route path="profile" element={<SellerShopProfile />} />
                  <Route path="earnings" element={<SellerEarnings />} />
                  <Route path="reports" element={<SellerReports />} />
                  <Route path="support" element={<SellerSupport />} />
                  <Route path="notifications" element={<SellerNotifications />} />
                  <Route path="brands" element={<SellerBrandManager />} />
                  <Route path="customized-products" element={<SellerCustomizedProducts />} />
                  <Route path="customized-orders" element={<SellerCustomizedOrders />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Shops Listing */}
                <Route path="/shops" element={<ShopsListingPage />} />
                <Route path="/shop/:slug" element={<ShopPage />} />

                {/* User Auth */}
                <Route path="/login" element={<PublicRoute restrictedTo="user"><UserLogin /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute restrictedTo="user"><UserRegister /></PublicRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<VerifyOtp />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Seller Auth */}
                <Route path="/seller/login" element={<PublicRoute restrictedTo="seller"><SellerLogin /></PublicRoute>} />
                <Route path="/seller/register" element={<PublicRoute restrictedTo="seller"><SellerRegister /></PublicRoute>} />

                {/* Admin Auth */}
                <Route path="/admin/login" element={<PublicRoute restrictedTo="admin"><AdminLogin /></PublicRoute>} />

                {/* Admin protected routes */}
                <Route
                  path="/admin"
                  element={
                    <RoleRoute role="admin">
                      <AdminLayout />
                    </RoleRoute>
                  }
                >
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="orders" element={<AllOrders />} />
                  <Route path="orders/customized" element={<CustomizedOrders />} />
                  <Route path="orders/:id" element={<OrderDetailsAdmin />} />
                  <Route path="users" element={<AllUsers />} />
                  <Route path="slider" element={<SliderList />} />
                  <Route path="slider/add" element={<SliderUpload />} />
                  <Route path="category" element={<CategoryList />} />
                  <Route path="category/add" element={<Category />} />
                  <Route path="category/edit/:id" element={<Category />} />
                  <Route path="subcategory" element={<SubCategoryList />} />
                  <Route path="subcategory/add" element={<SubCategory />} />
                  <Route path="subcategory/edit/:id" element={<SubCategory />} />
                  <Route path="products" element={<ProductList />} />
                  <Route path="products/add" element={<ProductUpload />} />
                  <Route path="products/edit/:id" element={<ProductUpload />} />
                  <Route path="products/customized" element={<CustomizedProducts />} />
                  <Route path="brands" element={<BrandList />} />
                  <Route path="promos" element={<PromoManager />} />
                  <Route path="collections" element={<CollectionManager />} />
                  <Route path="price-hunt" element={<PriceHuntManager />} />
                  <Route path="video-discovery" element={<VideoDiscoveryManager />} />
                  <Route path="group-buys" element={<GroupBuyManager />} />
                  <Route path="profile" element={<AdminProfile />} />
                  <Route path="chat" element={<AdminChat />} />
                  <Route path="attributes" element={<AttributeManager />} />
                  <Route path="verifications" element={<SellerVerification />} />
                  <Route path="scripts" element={<ScriptManager />} />
                  <Route path="events" element={<EventExplorer />} />
                  <Route path="consents" element={<ConsentHistory />} />
                  <Route path="popups" element={<PopupSettings />} />
                  <Route path="coupons" element={<CouponManager />} />
                  <Route path="cache" element={<CacheManagement />} />
                  <Route path="system-health" element={<SystemHealth />} />
                  <Route path="alerts" element={<AlertManager />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="heatmap" element={<HeatmapExplorer />} />
                  <Route path="hadoop" element={<HadoopMonitor />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Product Review Routes */}
                <Route path="/product/:slug/write-review" element={<RoleRoute role="user"><WriteReviewPage /></RoleRoute>} />
                <Route path="/product/:slug/reviews" element={<ProductReviewsPage />} />

                {/* Product Routes - Dynamic routes must be last */}
                <Route path="/product/:slug" element={<ProductDetails />} />
                <Route path="/product/*" element={<NotFoundPage />} />

                <Route path="/:categorySlug" element={<CategoryPage />} />
                <Route path="/:categorySlug/:subcategorySlug" element={<CategoryPage />} />
                <Route path="/:categorySlug/:subcategorySlug/:brandSlug" element={<CategoryPage />} />


                {/* 404 fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ConfirmationProvider>
        </Layout>
      </DeliveryLocationProvider>
      {/* AuthProvider moved to index.js */}

      <CookieConsent />
      <ScriptLoader />
      <AutoTracker />
      <AnalyticsTracker />
      <PopupManager />
      <ToastContainer />
    </Router>
  );
}

export default App;
