import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import "./ChatPage.css";

import { useParams } from "react-router-dom";


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SOCKET_URL = API_BASE_URL;
const socket = io(SOCKET_URL, { withCredentials: true });

const faqOptions = [
    { id: 1, text: "Where is my order?", category: "orders" },
    { id: 2, text: "I want to return/exchange an item", category: "returns" },
    { id: 3, text: "Payment related issue", category: "payment" },
    { id: 4, text: "Product inquiry", category: "product" },
    { id: 5, text: "Connect with an agent", category: "agent" },
];

const ChatPage = () => {
    const { type, id: combinedId } = useParams();
    // User state
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);

    // Support Context (if coming from order details)
    const [supportOrder, setSupportOrder] = useState(null);
    const [, setSupportItem] = useState(null);

    // Guest verification state
    const [guestEmail, setGuestEmail] = useState("");
    const [guestVerified, setGuestVerified] = useState(false);
    const [guestUser, setGuestUser] = useState(null);
    const [verifyError, setVerifyError] = useState("");
    const [verifyLoading, setVerifyLoading] = useState(false);

    // Chat state
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState("");
    const [step, setStep] = useState("welcome"); // welcome, selectTopic, selectOrder, chat
    const [ticketId, setTicketId] = useState(null);
    const [subject, setSubject] = useState("");
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Check if user is logged in
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("userToken");
        let parsedUser = null;

        if (storedUser && token) {
            parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchUserOrders(token);
        }

        if (type === "3" && combinedId) {
            // Split orderId and itemId (joined with _)
            const [oId, iId] = combinedId.split('_');
            fetchSupportOrder(oId, iId, parsedUser);
        } else if (parsedUser) {
            // Set welcome message for logged in user
            setMessages([
                {
                    from: "bot",
                    message: `Hey ${parsedUser.name} 👋🏼, I'm your Shopkart Support Assistant. How can I help you today?`,
                },
            ]);
            setStep("selectTopic");
        } else {
            // Not logged in - show email verification
            setMessages([
                {
                    from: "bot",
                    message: "👋 Hi! Welcome to Shopkart Support. Please enter your email to continue.",
                },
            ]);
            setStep("askEmail");
        }
    }, [type, combinedId]);

    const fetchSupportOrder = async (orderId, itemId, currentUser) => {
        try {
            const token = localStorage.getItem("userToken");
            const res = await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const order = res.data.order;
            const item = order.items.find(i => String(i.id) === String(itemId) || String(i.product_id) === String(itemId)) || order.items[0];

            setSupportOrder(order);
            setSupportItem(item);

            const userName = currentUser?.name || order.user_name || "there";

            setMessages([
                {
                    from: "bot",
                    message: `Hey ${userName} 👋🏼, I’m your Flipkart Support Assistant`,
                    type: "support_welcome",
                    item: item,
                    orderStatus: order.status
                },
            ]);
            setStep("support_options");
        } catch (err) {
            console.error("Support Order Fetch Error:", err);
        }
    };

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Socket listeners
    useEffect(() => {
        const handleReceiveMessage = (data) => {
            if (data.ticketId === ticketId || !ticketId) {
                setMessages((prev) => [...prev, { from: data.sender, message: data.message }]);
            }
        };

        const handleTicketClosed = (data) => {
            setMessages((prev) => [...prev, { from: "system", message: data.message }]);
            setTicketId(null);
            setStep("closed");
        };

        socket.on("receiveMessage", handleReceiveMessage);
        socket.on("ticketClosed", handleTicketClosed);
        socket.on("typing", ({ sender }) => {
            if (sender === "admin") setTyping(true);
        });
        socket.on("stopTyping", ({ sender }) => {
            if (sender === "admin") setTyping(false);
        });

        return () => {
            socket.off("receiveMessage", handleReceiveMessage);
            socket.off("ticketClosed", handleTicketClosed);
            socket.off("typing");
            socket.off("stopTyping");
        };
    }, [ticketId]);

    // Fetch ticket messages when ticketId changes
    useEffect(() => {
        if (!ticketId) return;

        socket.emit("joinRoom", `ticket_${ticketId}`);

        fetch(`${SOCKET_URL}/chatbot/messages/${ticketId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.messages && data.messages.length > 0) {
                    setMessages((prev) => [...prev, ...data.messages]);
                }
            })
            .catch(console.error);
    }, [ticketId]);

    const fetchUserOrders = async (token) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/orders/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("Orders response:", res.data);
            // API returns { orders: [...] } format
            const ordersData = res.data.orders || res.data || [];
            setOrders(ordersData);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        }
    };

    const handleGuestVerify = async (e) => {
        e.preventDefault();
        if (!guestEmail.trim()) {
            setVerifyError("Please enter your email");
            return;
        }

        setVerifyLoading(true);
        setVerifyError("");

        try {
            const res = await fetch(`${API_BASE_URL}/chatbot/verify-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: guestEmail }),
            });
            const data = await res.json();

            if (data.exists) {
                setGuestUser({ id: data.userId, name: data.name, email: guestEmail });
                setGuestVerified(true);
                setMessages([
                    {
                        from: "bot",
                        message: `Hey ${data.name} 👋🏼, I verified your account. How can I help you today?`,
                    },
                ]);
                setStep("selectTopic");

                // Fetch orders for guest
                const loginRes = await fetch(`${API_BASE_URL}/chatbot/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emailOrMobile: guestEmail }),
                });
                const loginData = await loginRes.json();
                if (loginData.orders) {
                    setOrders(loginData.orders);
                }
            } else {
                setVerifyError("Email not found. Please check and try again, or create an account.");
            }
        } catch (err) {
            setVerifyError("Something went wrong. Please try again.");
        }
        setVerifyLoading(false);
    };

    const handleTopicSelect = (topic) => {
        setSubject(topic.text);

        if (topic.category === "orders" || topic.category === "returns") {
            if (orders.length > 0) {
                setMessages((prev) => [
                    ...prev,
                    { from: "user", message: topic.text },
                    { from: "bot", message: "Please select the order you need help with:" },
                ]);
                setStep("selectOrder");
            } else {
                setMessages((prev) => [
                    ...prev,
                    { from: "user", message: topic.text },
                    { from: "bot", message: "You don't have any orders yet. Is there anything else I can help you with?" },
                ]);
                setStep("selectTopic");
            }
        } else if (topic.category === "agent") {
            startAgentChat(topic.text);
        } else {
            startAgentChat(topic.text);
        }
    };

    const handleSupportOption = (option) => {
        let userMsg = "";
        let botMsg = "";

        switch (option) {
            case "return":
                userMsg = "I need to return the item";
                botMsg = "I'm sorry to hear that. I'm connecting you with a returns specialist to help you further...";
                break;
            case "invoice":
                userMsg = "Get my bill or invoice";
                botMsg = "Sure! You can download it directly from the Order Details page, or I can connect you with an agent to send it to you.";
                break;
            case "supercoins":
                userMsg = "Know more about SuperCoins";
                botMsg = "SuperCoins are rewards you earn on every purchase. Let me connect you with an agent for specific details about your balance.";
                break;
            case "other":
                userMsg = "Something else";
                botMsg = "No problem! Connecting you with an agent now...";
                break;
            default:
                return;
        }

        setMessages((prev) => [
            ...prev,
            { from: "user", message: userMsg },
            { from: "bot", message: botMsg },
        ]);

        startAgentChat(`${subject || 'Support Request'} - ${userMsg} (Order #${supportOrder.orderId || supportOrder.id})`);
    };

    const handleOrderSelect = (order) => {
        // Handle both parsed and stringified items
        const orderItems = typeof order.items === 'string' ? JSON.parse(order.items || "[]") : (order.items || []);
        const itemNames = orderItems.map((i) => i.name).join(", ");
        const orderId = order.orderId || order.id;
        setMessages((prev) => [
            ...prev,
            { from: "user", message: `Order #${orderId}: ${itemNames.substring(0, 50)}...` },
            { from: "bot", message: "I understand you need help with this order. Let me connect you with our support team..." },
        ]);
        startAgentChat(`${subject} - Order #${orderId}`);
    };

    const startAgentChat = async (ticketSubject) => {
        setStep("chat");

        const currentUserId = user?.id || guestUser?.id;
        if (!currentUserId) return;

        try {
            // Check for active ticket
            const activeRes = await fetch(`${API_BASE_URL}/chatbot/active-ticket/${currentUserId}`);
            const activeData = await activeRes.json();

            if (activeData.ticketId) {
                setTicketId(activeData.ticketId);
                setMessages((prev) => [
                    ...prev,
                    { from: "bot", message: "Connecting you with our support team..." },
                ]);
            } else {
                // Create new ticket
                const queryRes = await fetch(`${API_BASE_URL}/chatbot/send-query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: currentUserId,
                        message: `New support request: ${ticketSubject}`,
                        subject: ticketSubject,
                    }),
                });
                const queryData = await queryRes.json();
                setTicketId(queryData.ticketId);
                socket.emit("joinRoom", `ticket_${queryData.ticketId}`);
                setMessages((prev) => [
                    ...prev,
                    { from: "bot", message: "You're connected! An agent will respond shortly. Feel free to type your message." },
                ]);
            }
        } catch (err) {
            console.error("Failed to start chat:", err);
            setMessages((prev) => [
                ...prev,
                { from: "bot", message: "Something went wrong. Please try again." },
            ]);
        }
    };

    const handleSendMessage = () => {
        if (!newMsg.trim()) return;

        const currentUserId = user?.id || guestUser?.id;
        setMessages((prev) => [...prev, { from: "user", message: newMsg }]);
        const msgToSend = newMsg;
        setNewMsg("");

        if (ticketId && currentUserId) {
            fetch(`${API_BASE_URL}/chatbot/send-query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUserId, message: msgToSend, subject }),
            })
                .then((res) => res.json())
                .then((data) => {
                    socket.emit("userMessage", { ticketId: data.ticketId, message: msgToSend, sender: "user" });
                })
                .catch(console.error);
        }
    };

    const handleStartNewChat = () => {
        setMessages([
            {
                from: "bot",
                message: `Hey ${user?.name || guestUser?.name} 👋🏼, How can I help you today?`,
            },
        ]);
        setTicketId(null);
        setStep("selectTopic");
    };

    const currentUser = user || guestUser;

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto md:px-4 md:py-8 min-h-screen md:min-h-0">
                {/* Header */}
                <div className="bg-white text-gray-800 p-3 md:rounded-t-lg flex items-center gap-3 border-b shadow-sm">
                    <div className="w-8 h-8 bg-[#fbde00] rounded-full flex items-center justify-center border border-yellow-400">
                        <span className="text-[#2874f0] font-black text-xl italic font-serif">f</span>
                    </div>
                    <div className="w-full h-[1px] bg-gray-100 absolute left-0 bottom-0"></div>
                </div>

                {/* Chat Container */}
                <div className="bg-white rounded-b-lg shadow-lg">
                    {/* Messages Area */}
                    <div className="h-[500px] overflow-y-auto p-4 chat-messages-container">
                        {/* Email Verification (for guests) */}
                        {step === "askEmail" && !guestVerified && (
                            <div className="mb-4">
                                <div className="bg-gray-100 rounded-lg p-4 max-w-md">
                                    <p className="text-gray-700 mb-3">👋 Hi! Please enter your email to continue.</p>
                                    <form onSubmit={handleGuestVerify} className="space-y-3">
                                        <input
                                            type="email"
                                            value={guestEmail}
                                            onChange={(e) => {
                                                setGuestEmail(e.target.value);
                                                setVerifyError("");
                                            }}
                                            placeholder="Enter your email"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#dc3545]"
                                        />
                                        {verifyError && <p className="text-red-500 text-sm">{verifyError}</p>}
                                        <button
                                            type="submit"
                                            disabled={verifyLoading}
                                            className="w-full bg-[#dc3545] text-white py-2 rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-70"
                                        >
                                            {verifyLoading ? "Verifying..." : "Continue"}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`mb-4 flex flex-col ${msg.from === "user" ? "items-end" : "items-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] px-4 py-3 shadow-sm rounded-lg ${msg.from === "user"
                                        ? "bg-white text-gray-800 border border-gray-100"
                                        : msg.from === "system"
                                            ? "bg-yellow-50 text-yellow-800 text-center w-full"
                                            : "bg-white text-gray-800 border border-gray-100"
                                        }`}
                                >
                                    <p className="text-[13px] leading-relaxed font-sans">{msg.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 text-right">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>

                                {msg.type === "support_welcome" && (
                                    <div className="mt-3 w-full max-w-[280px] space-y-3">
                                        {/* Product Card Message */}
                                        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                                            <div className="p-4 flex flex-col items-center">
                                                <img
                                                    src={`${API_BASE_URL}${msg.item.image?.replace(/^\/?assets/, "/assets")}`}
                                                    alt={msg.item.name}
                                                    className="w-32 h-32 object-contain mb-3"
                                                />
                                                <p className="text-[11px] text-gray-600 font-bold text-center line-clamp-2 uppercase tracking-tight">{msg.item.name}</p>
                                            </div>
                                        </div>

                                        {/* Status Message */}
                                        <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-100">
                                            <p className="text-[13px] text-gray-800 font-sans">
                                                I see that your product is {msg.orderStatus} to you
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 text-right">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>

                                        {/* Options Card */}
                                        {step === "support_options" && (
                                            <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100">
                                                <div className="p-4 border-b bg-white">
                                                    <p className="text-sm font-bold text-gray-800">How may I help you?</p>
                                                </div>
                                                <div className="flex flex-col">
                                                    {[
                                                        { id: "return", text: "I need to return the item" },
                                                        { id: "invoice", text: "Get my bill or invoice" },
                                                        { id: "supercoins", text: "Know more about SuperCoins" },
                                                        { id: "warranty", text: "Check warranty" },
                                                        { id: "other", text: "Something else" }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => handleSupportOption(opt.id)}
                                                            className="w-full text-left p-4 text-[13px] text-blue-600 border-b border-gray-50 hover:bg-gray-50 transition font-medium"
                                                        >
                                                            {opt.text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Topic Selection */}
                        {step === "selectTopic" && (
                            <div className="mt-4">
                                <p className="text-gray-600 text-sm mb-3">Quick options:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {faqOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => handleTopicSelect(option)}
                                            className="text-left p-3 border border-gray-200 rounded-lg hover:border-[#dc3545] hover:bg-red-50 transition flex items-center gap-2"
                                        >
                                            <span className="text-lg">
                                                {option.category === "orders" && "📦"}
                                                {option.category === "returns" && "↩️"}
                                                {option.category === "payment" && "💳"}
                                                {option.category === "product" && "🏷️"}
                                                {option.category === "agent" && "👤"}
                                            </span>
                                            {option.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Order Selection */}
                        {step === "selectOrder" && orders.length > 0 && (
                            <div className="mt-4">
                                <p className="text-gray-600 text-sm mb-3">Your recent orders:</p>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {orders.slice(0, 5).map((order) => {
                                        // Handle both parsed and stringified items
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items || "[]") : (order.items || []);
                                        const orderId = order.orderId || order.id;
                                        const orderTotal = order.total || order.total_amount;
                                        return (
                                            <button
                                                key={orderId}
                                                onClick={() => handleOrderSelect(order)}
                                                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-[#dc3545] hover:bg-red-50 transition"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-gray-800">Order #{orderId}</span>
                                                    <span className="text-sm text-gray-500">
                                                        ₹{orderTotal}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 truncate">
                                                    {items.map((i) => i.name).join(", ")}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Typing indicator */}
                        {typing && (
                            <div className="flex justify-start mb-3">
                                <div className="bg-gray-100 rounded-lg px-4 py-2 text-gray-600 italic">
                                    Agent is typing...
                                </div>
                            </div>
                        )}

                        {/* Closed ticket option */}
                        {step === "closed" && (
                            <div className="mt-4 text-center">
                                <p className="text-gray-600 mb-3">This conversation has been closed.</p>
                                <button
                                    onClick={handleStartNewChat}
                                    className="bg-[#dc3545] text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition"
                                >
                                    Start New Conversation
                                </button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {(step === "chat" || step === "support_options") && (
                        <div className="border-t p-2 md:p-4 bg-white relative">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMsg}
                                    onChange={(e) => {
                                        setNewMsg(e.target.value);
                                        if (ticketId) {
                                            socket.emit("typing", { room: `ticket_${ticketId}`, sender: "user" });
                                            clearTimeout(window.typingTimeout);
                                            window.typingTimeout = setTimeout(() => {
                                                socket.emit("stopTyping", { room: `ticket_${ticketId}`, sender: "user" });
                                            }, 2000);
                                        }
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder="Write a Message..."
                                    className="flex-1 px-4 py-3 text-[14px] border-none focus:outline-none focus:ring-0 placeholder:text-gray-400"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* User Info Footer */}
                    {currentUser && (
                        <div className="border-t p-3 bg-gray-50 text-center text-sm text-gray-500 rounded-b-lg">
                            Logged in as: <span className="font-medium">{currentUser.name}</span> ({currentUser.email || guestEmail})
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};

export default ChatPage;
