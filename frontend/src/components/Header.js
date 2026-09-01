import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import './Header.css';
import axios from 'axios';
import AuthModal from './AuthModal/AuthModal';
import { useNavigate, Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { toastSuccess } from "../utils/toast";
import { Search, ShoppingCart, User, Package, ChevronDown, Menu, X, Heart, Crown, Ticket, Gift, Bell, Power, CircleUser, Store, LayoutDashboard, Flame } from 'lucide-react';
import { useAuth } from "../context/AuthContext";

import { generateProductUrl, preserveQueryParams } from "../utils/productUrl";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Header = () => {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [activeCat, setActiveCat] = useState(null);
  const [menuLocked, setMenuLocked] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const { cart, clearCart } = useContext(CartContext);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [superCoinBalance, setSuperCoinBalance] = useState(0);
  const searchRef = useRef(null);

  const closeTimeoutRef = useRef(null);

  // Fetch wishlist count
  const fetchWishlistCount = useCallback(async () => {
    try {
      if (!user) { // check user object instead of token
        setWishlistCount(0);
        return;
      }

      // We use axios here for credentials, though fetch with credentials: 'include' also works
      const res = await axios.get(`${API_BASE_URL}/users/wishlist`, { withCredentials: true });
      const data = res.data;

      const count = Array.isArray(data) ? data.length : (data.wishlist?.length || 0);
      setWishlistCount(count);
      localStorage.setItem("wishlistCount", count);
    } catch (err) {
      console.error("Failed to fetch wishlist count:", err);
    }
  }, [user]);

  useEffect(() => {
    // Listen for wishlist updates
    const handleWishlistUpdate = () => {
      const count = parseInt(localStorage.getItem("wishlistCount") || "0");
      setWishlistCount(count);
    };
    window.addEventListener("wishlistUpdate", handleWishlistUpdate);

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/category`);
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("❌ Failed to fetch categories:", err);
      }
    };
    fetchCategories();

    // Listen for external login triggers
    const handleOpenLogin = () => setModalOpen(true);
    window.addEventListener("openLoginModal", handleOpenLogin);

    // Initial wishlist fetch
    fetchWishlistCount();

    // Fetch SuperCoin balance if user exists
    if (user) {
      const fetchSuperCoins = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/users/me/supercoins`, { withCredentials: true });
          setSuperCoinBalance(res.data.balance);
        } catch (err) {
          console.error("Failed to fetch supercoins", err);
        }
      };
      fetchSuperCoins();
    }

    return () => {
      window.removeEventListener("wishlistUpdate", handleWishlistUpdate);
      window.removeEventListener("openLoginModal", handleOpenLogin);
    };
  }, [user, fetchWishlistCount]);

  // Logout function
  const logout = () => {
    authLogout('user');
    setAccountDropdown(false);
    clearCart();
    navigate("/");
    toastSuccess("Logged out successfully");
  };

  // Pre-fetch subcategories for all categories to prevent layout shift on hover
  // The arrow icon only appears if subcategories exist. By fetching upfront, we ensure 
  // the arrow is present (or absent) from the start, rather than appearing and shifting layout on hover.
  useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      const fetchAllSubcategories = async () => {
        const newSubs = {};
        await Promise.all(
          categories.map(async (cat) => {
            try {
              const res = await fetch(`${API_BASE_URL}/subcategory/${cat.id}`);
              if (res.ok) {
                const data = await res.json();
                newSubs[cat.id] = data;
              }
            } catch (err) {
              console.error(`Error pre-fetching subcategories for ${cat.name}`, err);
            }
          })
        );

        setSubcategories(prev => ({ ...prev, ...newSubs }));
      };

      fetchAllSubcategories();
    }
  }, [categories]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuOpen]);

  const handleAccountMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setAccountDropdown(true);
  };

  const handleAccountMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setAccountDropdown(false);
    }, 200);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    const url = `/search/?q=${encodeURIComponent(trimmed)}`;
    navigate(url);
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const fetchSubcategories = async (catId) => {
    try {
      if (!subcategories[catId]) {
        // Add cache-busting parameter to ensure fresh data
        const res = await fetch(`${API_BASE_URL}/subcategory/${catId}?t=${Date.now()}`);
        const data = await res.json();
        setSubcategories((prev) => ({ ...prev, [catId]: data }));
      }
      setActiveCat(catId);
    } catch (err) {
      console.error("❌ Failed to fetch subcategories:", err);
    }
  };

  // Search suggestions logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      const trimmed = searchInput.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/products/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        setSuggestions(res.data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (searchInput.trim()) {
        fetchSuggestions();
      }
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (s) => {
    setShowSuggestions(false);
    if (s.type === 'product') {
      const url = generateProductUrl(
        { id: s.ref_id, slug: s.slug },
        null,
        null,
        { otracker: 'search', otracker1: 'search' }
      );
      navigate(url);
    } else if (s.type === 'category') {
      navigate(`/search/?q=${encodeURIComponent(s.text)}`);
    } else if (s.type === 'brand') {
      navigate(`/search/?q=${encodeURIComponent(s.text)}`);
    }
    setSearchInput(s.text);
  };

  return (
    <>
      {/* --- Main Blue Header --- */}
      <header className="sticky top-0 z-[1000] bg-white h-auto md:h-[64px] shadow-sm border-b border-gray-100">
        <div className="max-w-[1248px] mx-auto h-[64px] flex items-center px-3 gap-4 md:gap-8 justify-between">

          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-3">
            <button className="md:hidden text-black" onClick={toggleMenu}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="flex flex-col leading-none italic pointer cursor-pointer">
              <img src="/logo/logo-e.png" alt="Logo" className="h-16" fetchPriority="high" />
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 w-full max-w-[550px] relative hidden md:block" ref={searchRef}>
            <div className="flex items-center  border border-gray-200 h-[36px] px-2 shadow-none focus-within:ring-1 focus-within:ring-brand-orange">
              <input
                type="text"
                className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-500"
                placeholder="Search for products, brands and more"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                    setShowSuggestions(false);
                  }
                }}
              />
              <Search className="text-orange-500 cursor-pointer hover:text-brand-orange" size={20} onClick={handleSearchSubmit} />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-[38px] left-0 right-0 bg-white shadow-xl rounded-sm border border-gray-100 z-[2000] overflow-hidden">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    {s.type === 'product' ? (
                      <div className="w-8 h-8 flex-shrink-0">
                        <img src={`${API_BASE_URL}${s.image}`} className="w-full h-full object-contain" alt="" />
                      </div>
                    ) : s.type === 'category' ? (
                      <LayoutDashboard size={18} className="text-gray-400" />
                    ) : (
                      <Store size={18} className="text-gray-400" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{s.text}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{s.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6 md:gap-8">
            {/* Login / Account */}
            {!user ? (
              <button
                onClick={() => setModalOpen(true)}
                className="bg-brand-orange text-white font-semibold px-8 py-1 rounded-sm text-sm hover:bg-brand-orange-hover transition shadow-sm"
              >
                Login
              </button>
            ) : (
              <div
                className="relative group cursor-pointer h-full flex items-center"
                onMouseEnter={handleAccountMouseEnter}
                onMouseLeave={handleAccountMouseLeave}
              >
                <div className="flex items-center gap-2 text-primary-text font-medium text-sm py-2 group-hover:text-brand-orange">
                  <div className="relative">
                    <CircleUser size={20} />
                  </div>
                  <span>{user.name && user.name.split(" ")[0]}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${accountDropdown ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Clean Simple Dropdown */}
                {accountDropdown && (
                  <div
                    className="absolute right-0 top-[45px] w-[240px] pt-0 z-[1001] animate-in fade-in zoom-in-95 duration-200"
                    onMouseEnter={handleAccountMouseEnter}
                    onMouseLeave={handleAccountMouseLeave}
                  >
                    {/* Arrow - Now outside the overflow-hidden box */}
                    <div className="absolute top-1 right-6 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45 transform z-0"></div>

                    <div className="relative bg-white text-gray-800  rounded-lg border border-gray-100 overflow-hidden z-10">

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* My Profile */}
                        {/* <Link
                          to="/account/profile/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <User size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">My Profile</span>
                        </Link> */}

                        {/* My Profile */}
                        <Link
                          to="/account/profile/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <User size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">My Profile</span>
                        </Link>

                        {/* SuperCoin Zone */}
                        <Link
                          to="/account/supercoins/"
                          className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <Crown size={20} className="text-orange-500" />
                            <span className="text-[15px] font-bold text-gray-800">SuperCoins</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-orange-200 shadow-sm">
                            <Flame size={12} className="text-orange-600 fill-current" />
                            <span className="text-sm font-black text-orange-700">{superCoinBalance}</span>
                          </div>
                        </Link>

                        {/* Flipkart Plus Zone */}
                        <Link
                          to="/plus/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="text-[15px] text-gray-800">Flipkart Plus Zone</span>
                        </Link>

                        {/* Orders */}
                        <Link
                          to="/account/orders/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <Package size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">Orders</span>
                        </Link>

                        {/* Wishlist with count */}
                        <Link
                          to="/wishlist/"
                          className="flex items-center justify-between gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <Heart size={20} className="text-brand-orange" fill="#FF7A00" />
                            <span className="text-[15px] text-gray-800">Wishlist</span>
                          </div>
                          {wishlistCount > 0 && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded">{wishlistCount}</span>
                          )}
                        </Link>

                        {/* Coupons */}
                        <Link
                          to="/account/coupons/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <Ticket size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">Coupons</span>
                        </Link>

                        {/* Gift Cards */}
                        <Link
                          to="/account/gift-cards/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <Gift size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">Gift Cards</span>
                        </Link>

                        {/* Notifications */}
                        <Link
                          to="/account/notifications/"
                          className="flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <Bell size={20} className="text-brand-orange" />
                          <span className="text-[15px] text-gray-800">Notifications</span>
                        </Link>

                        {/* Logout */}
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-4 py-3.5 hover:bg-gray-50 transition-colors text-gray-800"
                        >
                          <Power size={20} className="text-brand-orange" />
                          <span className="text-[15px]">Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* More */}
            <div className="hidden md:flex items-center gap-1 text-primary-text font-medium text-sm cursor-pointer group hover:text-brand-orange">
              <span>More</span>
              <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
            </div>

            {/* Cart */}
            <Link to="/cart/" className="flex items-center gap-2 text-primary-text font-medium text-sm hover:text-brand-orange">
              <div className="relative">
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="hidden md:inline">Cart</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar (visible only on mobile) */}
        <div className="md:hidden px-2 pb-2 pt-0 bg-white relative">
          <div className="flex items-center border border-gray-200 bg-[#f0f2f5] h-[44px] px-2 transition-all focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-orange focus-within:border-brand-orange">
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-[15px] text-gray-700 placeholder-gray-500 w-full"
              placeholder="Search for products, brands and more"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                  setShowSuggestions(false);
                }
              }}
            />
            <Search className="text-gray-400 text-orange-500" size={20} onClick={() => { handleSearchSubmit(); setShowSuggestions(false); }} />
          </div>

          {/* Mobile Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[44px] left-2 right-2 bg-white shadow-xl border border-gray-100 z-[2001] rounded-b-lg overflow-hidden">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s.type === 'product' ? (
                    <div className="w-8 h-8 flex-shrink-0">
                      <img src={`${API_BASE_URL}${s.image}`} className="w-full h-full object-contain" alt="" />
                    </div>
                  ) : s.type === 'category' ? (
                    <LayoutDashboard size={18} className="text-gray-400" />
                  ) : (
                    <Store size={18} className="text-gray-400" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{s.text}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">{s.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </header >

      {/* --- Auth Modal --- */}
      < AuthModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />



      {/* --- Category Strip (Home-like) --- */}
      <div
        className="bg-white border-b border-gray-200 shadow-sm hidden md:block relative z-40"
        onMouseLeave={() => {
          // Don't close if menu is locked for inspection
          if (!menuLocked) {
            setTimeout(() => setActiveCat(null), 300);
          }
        }}
        onContextMenu={(e) => {
          // Keep menu open when right-clicking to inspect
          e.stopPropagation();
        }}
      >
        <div className="max-w-[1248px] mx-auto py-3 px-4 flex items-center justify-between gap-4 overflow-x-auto md:overflow-visible relative">
          {Array.isArray(categories) && categories.map((cat) => (
            <div key={cat.id} className="group relative cursor-pointer" onMouseEnter={() => fetchSubcategories(cat.id)}>
              <Link to={preserveQueryParams(`/${cat.slug}/`)} className="flex flex-col items-center gap-1 min-w-[64px]" onMouseEnter={() => setActiveCat(cat.id)} onClick={() => setActiveCat(null)}>
                <div className="w-16 h-16 rounded-full overflow-hidden hover:scale-105 transition-transform duration-200">
                  <img src={`${API_BASE_URL}${cat.image}`} alt={cat.name} className="w-full h-full object-contain bg-gray-100" loading="lazy" />
                </div>
                <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-orange flex items-center gap-0.5">
                  {cat.name}
                  {subcategories[cat.id] && subcategories[cat.id].length > 0 && <ChevronDown size={15} className="text-gray-800 group-hover:text-brand-orange group-hover:rotate-180 transition-transform" />}
                </span>
              </Link>
            </div>
          ))}
        </div>


        {/* Mega Menu Dropdown - Full Width Overlay */}
        {activeCat && subcategories[activeCat] && subcategories[activeCat].length > 0 && (
          <div
            className="hidden md:block absolute left-12 right-12 top-full bg-white shadow-2xl z-50 rounded-b-lg border-t border-gray-100"
            style={{ marginTop: '-1px' }}
            onMouseEnter={() => { }} // Keep active
            onDoubleClick={() => {
              // Double-click to lock/unlock menu for inspection
              setMenuLocked(!menuLocked);
              console.log(menuLocked ? '🔓 Menu unlocked' : '🔒 Menu locked for inspection');
            }}
            title={menuLocked ? 'Double-click to unlock menu' : 'Double-click to lock menu for inspection'}
          >
            <div className="max-w-[1200px] mx-auto px-6 py-5">
              <div className="columns-4 gap-6" style={{ columnFill: 'balance' }}>
                {/* Filter for Top-Level Groups */}
                {subcategories[activeCat]
                  .filter(sub => !sub.parent_id || sub.parent_id === 0)
                  .map(group => (
                    <div key={group.id} className="break-inside-avoid mb-4">
                      {/* Group Header */}
                      <Link
                        to={preserveQueryParams(`/${categories.find(c => c.id === activeCat)?.slug}/${group.slug}/`)}
                        className="block font-semibold text-gray-900 text-[13px] mb-1.5 hover:text-brand-orange transition-colors"
                        onClick={() => setActiveCat(null)}
                      >
                        {group.name}
                      </Link>
                      {/* Items */}
                      <div className="flex flex-col">
                        {subcategories[activeCat]
                          .filter(child => child.parent_id === group.id)
                          .slice(0, 12)
                          .map(child => (
                            <Link
                              key={child.id}
                              to={preserveQueryParams(`/${categories.find(c => c.id === activeCat)?.slug}/${group.slug}/${child.slug}/`)}
                              className="text-[12px] text-gray-500 hover:text-brand-orange transition-colors py-[3px] leading-snug"
                              onClick={() => setActiveCat(null)}
                            >
                              {child.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Mobile Sidebar Menu --- */}
      {menuOpen && (
        <div className="fixed inset-0 z-[5000] flex md:hidden transition-all duration-300">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={toggleMenu}
          ></div>

          {/* Sidebar */}
          <div className="relative w-[85%] max-w-[320px] bg-white h-full shadow-[20px_0_50px_rgba(0,0,0,0.2)] overflow-y-auto flex flex-col transform transition-transform duration-300">
            {/* Drawer Header */}
            <div className="bg-white p-3 flex justify-between items-center border-b border-gray-100 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                  <User size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium">Welcome,</span>
                  <span className="text-sm font-bold text-gray-800 truncate max-w-[150px]">
                    {user ? user.name : "Guest User"}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleMenu}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Browse Categories
              </div>
              <div className="grid grid-cols-1 divide-y divide-gray-50">
                {Array.isArray(categories) && categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={preserveQueryParams(`/${cat.slug}/`)}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors group"
                    onClick={toggleMenu}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center p-1.5 border border-gray-100 group-hover:bg-white transition-colors">
                        <img src={`${API_BASE_URL}${cat.image}`} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-orange transition-colors">
                        {cat.name}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-300 -rotate-90" />
                  </Link>
                ))}
              </div>

              <div className="mt-4 px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100 pt-4">
                Account & Settings
              </div>
              <div className="flex flex-col pb-6">
                <Link to="/account/orders/" onClick={toggleMenu} className="flex items-center gap-4 px-3 py-2 hover:bg-gray-50 text-gray-700">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Package size={20} />
                  </div>
                  <span className="text-sm font-medium">My Orders</span>
                </Link>
                <Link to="/cart/" onClick={toggleMenu} className="flex items-center gap-4 px-3 py-2 hover:bg-gray-50 text-gray-700">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                    <ShoppingCart size={20} />
                  </div>
                  <span className="text-sm font-medium">My Cart</span>
                </Link>
                <Link to="/wishlist/" onClick={toggleMenu} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-gray-700">
                  <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                    <Heart size={20} />
                  </div>
                  <span className="text-sm font-medium">My Wishlist</span>
                </Link>

                {user && (
                  <button
                    onClick={() => { logout(); toggleMenu(); }}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 text-red-600 transition-colors mt-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                      <Power size={20} />
                    </div>
                    <span className="text-sm font-bold">Log Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
