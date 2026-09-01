import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, AlertCircle } from "lucide-react";

const NotFoundPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if we're in a portal context
  const isPortal = location.pathname.startsWith('/admin') || location.pathname.startsWith('/seller');
  const isAdmin = location.pathname.startsWith('/admin');
  const isSeller = location.pathname.startsWith('/seller');

  const handleReturn = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    if (isAdmin) {
      navigate('/admin/dashboard');
    } else if (isSeller) {
      navigate('/seller/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full">
        {/* 404 Illustration */}
        <div className="text-center mb-8">
          <div className="inline-block relative">
            <h1 className="text-[120px] md:text-[180px] font-bold text-gray-200 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl">
                <AlertCircle className="w-10 h-10 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Page Not Found
          </h2>
          <p className="text-gray-600 text-base md:text-lg mb-4">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Display attempted path */}
          <div className="inline-block bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 mb-2">
            <p className="text-sm text-gray-500 mb-1">Attempted path:</p>
            <code className="text-sm font-mono text-red-600 break-all">
              {location.pathname}
            </code>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={handleReturn}
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 min-w-[180px] justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
            Return
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3 rounded-lg border-2 border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md min-w-[180px] justify-center"
          >
            <Home className="w-5 h-5" />
            {isPortal ? 'Dashboard' : 'Homepage'}
          </button>
        </div>

        {/* Helpful tip */}
        {!isPortal && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Use the search bar at the top to find what you're looking for!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFoundPage;
