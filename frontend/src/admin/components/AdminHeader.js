import { useState, useEffect } from "react";
import { Search, Bell, Grid3x3, Sun, Moon, User } from "lucide-react";
import { io } from "socket.io-client";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Socket.IO setup for real-time notifications
const socket = io(API_BASE_URL, {
  withCredentials: true,
});

export default function AdminHeader() {
  const [theme, setTheme] = useState("light");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all"); // all, orders, reviews, chat
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from backend
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter(n => !n.read).length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    // Listen for real-time notifications
    socket.on("newOrder", (data) => {
      console.log("📦 Received newOrder event:", data);
      addNotification({
        id: Date.now(),
        type: "order",
        userName: data.userName || "Customer",
        userAvatar: null,
        action: "placed a new order",
        message: `Order #${data.orderId} - ${data.itemCount || 0} items`,
        time: new Date(),
        read: false,
      });
    });

    socket.on("newReview", (data) => {
      console.log("⭐ Received newReview event:", data);
      addNotification({
        id: Date.now(),
        type: "review",
        userName: data.userName || "User",
        userAvatar: null,
        action: `left a ${data.rating || 5}-star review`,
        message: data.comment?.substring(0, 50) || "New review received",
        time: new Date(),
        read: false,
      });
    });

    socket.on("newMessage", (data) => {
      console.log("💬 Received newMessage event:", data);
      addNotification({
        id: Date.now(),
        type: "chat",
        userName: data.userName || "User",
        userAvatar: null,
        action: "sent you a message",
        message: data.message?.substring(0, 50) + "..." || "New message",
        time: new Date(),
        read: false,
      });
    });

    return () => {
      socket.off("newOrder");
      socket.off("newReview");
      socket.off("newMessage");
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };



  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left - Logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-lg font-semibold text-gray-800">phoenix</span>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle theme"
        >
          {theme === "light" ? (
            <Sun size={20} className="text-gray-600" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            title="Notifications"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationFilter("all")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${notificationFilter === "all"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter("orders")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${notificationFilter === "orders"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    Orders ({notifications.filter(n => n.type === "order").length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter("reviews")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${notificationFilter === "reviews"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    Reviews ({notifications.filter(n => n.type === "review").length})
                  </button>
                  <button
                    onClick={() => setNotificationFilter("chat")}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${notificationFilter === "chat"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    Chat ({notifications.filter(n => n.type === "chat").length})
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  const filteredNotifications = notificationFilter === "all"
                    ? notifications
                    : notifications.filter(n => n.type === notificationFilter);

                  if (filteredNotifications.length === 0) {
                    return (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        No {notificationFilter === "all" ? "" : notificationFilter} notifications
                      </div>
                    );
                  }

                  return filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? "bg-blue-50" : ""
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* User Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {notification.userName?.charAt(0).toUpperCase() || "U"}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold">{notification.userName}</span>
                                {" "}
                                <span className="text-gray-600">{notification.action}</span>
                              </p>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {notification.message}
                              </p>
                            </div>
                            <button className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              {notification.time.toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 text-center">
                <button className="text-sm text-blue-600 hover:underline font-medium">
                  Notification history
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grid Menu */}
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Apps"
        >
          <Grid3x3 size={20} className="text-gray-600" />
        </button>

        {/* User Avatar */}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-md transition-shadow">
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
