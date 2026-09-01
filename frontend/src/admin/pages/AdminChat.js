import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Search, Phone, Video, MoreVertical, Send, Paperclip, Smile, CheckCheck, ArrowLeft } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Socket.IO setup
const socket = io(API_BASE_URL, {
  withCredentials: true,
});

function AdminChat() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, read, unread
  const messagesEndRef = useRef(null);
  const [mobileView, setMobileView] = useState("list"); // 'list' or 'chat'

  // Fetch tickets on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/adminchatbot/tickets`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (!data.tickets || !Array.isArray(data.tickets)) {
          console.error("Invalid tickets format:", data);
          return;
        }
        setTickets(data.tickets);
      })
      .catch((err) => console.error("Fetch tickets error:", err));
  }, []);

  // Join Socket.IO room for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;

    socket.emit("joinRoom", `ticket_${selectedTicket.id}`);

    // Load messages for selected ticket
    fetch(`${API_BASE_URL}/adminchatbot/ticket/${selectedTicket.id}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error(err));

    // Listen for real-time messages
    socket.on("receiveMessage", (msg) => {
      if (msg.ticketId === selectedTicket.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("typing", ({ sender }) => {
      if (sender === "user") setTyping(true);
    });

    socket.on("stopTyping", ({ sender }) => {
      if (sender === "user") setTyping(false);
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [selectedTicket]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMsg.trim() || !selectedTicket) return;

    const payload = {
      ticketId: selectedTicket.id,
      message: newMsg,
      sender: "admin",
      room: `ticket_${selectedTicket.id}`,
    };

    socket.emit("sendMessage", payload);
    setNewMsg("");
  };

  const handleCloseTicket = () => {
    if (!selectedTicket) return;

    fetch(`${API_BASE_URL}/adminchatbot/close-ticket/${selectedTicket.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Ticket closed:", data);
        setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
        setSelectedTicket(null);
        setMessages([]);
        setMobileView("list");
      })
      .catch((err) => console.error("Error closing ticket:", err));
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    setMobileView("chat");
  };

  const handleBackToList = () => {
    setMobileView("list");
    // Optional: setSelectedTicket(null); if you want to clear selection
  };


  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" ? true :
      activeTab === "read" ? t.status === "closed" :
        t.status !== "closed";
    return matchesSearch && matchesTab;
  });

  const openCount = tickets.filter(t => t.status !== "closed").length;
  const closedCount = tickets.filter(t => t.status === "closed").length;

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "a few seconds ago";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="flex h-[calc(100dvh-80px)] md:h-[calc(100vh-100px)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative my-2 mx-2 md:mx-0">
      {/* Left Sidebar - Conversations List */}
      <div className={`
          w-full md:w-80 border-r border-gray-200 flex flex-col bg-white absolute md:relative z-20 h-full transition-transform duration-300 transform
          ${mobileView === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Search Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${activeTab === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${activeTab === "read"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Closed ({closedCount})
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${activeTab === "unread"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Open ({openCount})
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              No conversations found
            </div>
          )}
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => handleTicketSelect(ticket)}
              className={`p-3 sm:p-4 border-b border-gray-100 cursor-pointer transition-colors ${selectedTicket?.id === ticket.id
                ? "bg-blue-50"
                : "hover:bg-gray-50"
                }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                  {ticket.user_name?.charAt(0).toUpperCase() || "U"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {ticket.user_name || "Unknown User"}
                    </h4>
                    <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap ml-2">
                      {formatTime(ticket.created_at)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {ticket.subject || "No subject"}
                  </p>
                </div>

                {/* Unread Badge */}
                {ticket.status !== "closed" && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div className={`flex-1 flex flex-col bg-gray-50 w-full h-full absolute md:relative z-10 transition-transform duration-300 transform ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-2 sm:p-4 shadow-sm flex-shrink-0 z-20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Back Button (Mobile Only) */}
                  <button onClick={handleBackToList} className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0">
                    <ArrowLeft size={20} />
                  </button>

                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
                    {selectedTicket.user_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base truncate">
                      {selectedTicket.user_name || "Unknown User"}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{selectedTicket.user_email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Phone size={18} className="text-blue-600" />
                  </button>
                  <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Video size={18} className="text-blue-600" />
                  </button>
                  <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical size={18} className="text-gray-600" />
                  </button>

                  {/* Close Ticket Button */}
                  {selectedTicket.status !== "closed" ? (
                    <button
                      onClick={handleCloseTicket}
                      className="px-2 py-1.5 sm:px-4 bg-red-50 text-red-600 text-xs sm:text-sm font-medium rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                    >
                      Close
                    </button>
                  ) : (
                    <span className="px-2 py-1.5 sm:px-4 bg-gray-100 text-gray-600 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap">
                      Closed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((m, i) => {
                const isAdmin = m.sender === "admin";
                const showTimestamp = i === 0 || new Date(messages[i - 1].created_at).getDate() !== new Date(m.created_at).getDate();

                return (
                  <React.Fragment key={i}>
                    {showTimestamp && (
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                          {formatTime(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] ${isAdmin ? "" : "flex items-start gap-2"}`}>
                        {!isAdmin && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 hidden sm:flex">
                            {selectedTicket.user_name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm ${isAdmin
                              ? "bg-blue-600 text-white rounded-br-sm"
                              : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                              }`}
                          >
                            {m.message}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isAdmin ? "justify-end" : ""}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isAdmin && <CheckCheck size={14} className="text-blue-600" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-semibold hidden sm:flex">
                      {selectedTicket.user_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Smile size={20} className="text-gray-600" />
                </button>
                <button className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Paperclip size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors sm:hidden">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>

                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMsg}
                  onChange={(e) => {
                    setNewMsg(e.target.value);
                    if (selectedTicket) {
                      socket.emit("typing", { room: `ticket_${selectedTicket.id}`, sender: "admin" });
                      clearTimeout(window.adminTypingTimeout);
                      window.adminTypingTimeout = setTimeout(() => {
                        socket.emit("stopTyping", { room: `ticket_${selectedTicket.id}`, sender: "admin" });
                      }, 2000);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={selectedTicket.status === "closed"}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />

                <button
                  onClick={handleSend}
                  disabled={selectedTicket.status === "closed" || !newMsg.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 hidden md:flex">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-sm text-gray-500">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminChat;
