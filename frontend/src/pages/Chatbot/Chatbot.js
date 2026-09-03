import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./Chatbot.css";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");
const SOCKET_URL = API_BASE_URL;
const socket = io(SOCKET_URL, { withCredentials: true });

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState("welcome");
  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem("chatUser");
    return saved ? JSON.parse(saved).userId : null;
  });
  const [ticketId, setTicketId] = useState(null);
  const [subject, setSubject] = useState(""); // 🆕 Subject State
  const messagesEndRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize chat when opened or userId changes
  useEffect(() => {
    if (!open) return;

    if (userId) {
      const saved = JSON.parse(localStorage.getItem("chatUser"));
      setMessages([{ from: "bot", message: `Welcome back, ${saved?.name || "User"}!` }]);

      // 🔄 Check for active ticket
      fetch(`${SOCKET_URL}/chatbot/active-ticket/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ticketId) {
            setTicketId(data.ticketId);
            setStep("query");
            setMessages((prev) => [...prev, { from: "bot", message: "Continuing your previous chat..." }]);
          } else {
            // If no active ticket, ask for subject
            setStep("askSubject");
            setMessages((prev) => [...prev, { from: "bot", message: "Please enter a subject for your new support ticket." }]);
          }
        })
        .catch(console.error);

    } else {
      setMessages([{ from: "bot", message: "👋 Hi! Welcome to our website. Can I have your email?" }]);
      setStep("askEmail");
    }

    const handleReceiveMessage = (data) => {
      // Only append if it belongs to current ticket (or we just started one)
      if (data.ticketId === ticketId || !ticketId) {
        setMessages((prev) => [...prev, { from: data.sender, message: data.message }]);
      }
    };

    const handleTicketClosed = (data) => {
      console.log("⚡ Ticket closed:", data);
      setMessages((prev) => [...prev, { from: "system", message: data.message }]);
      setTicketId(null);
      setStep("closed"); // Show concise "Closed" view
      // Do not clear user ID, just ticket
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
  }, [open, ticketId, userId]);

  // Fetch previous messages for the ticket
  useEffect(() => {
    if (!ticketId) return;

    socket.emit("joinRoom", `ticket_${ticketId}`);

    fetch(`${SOCKET_URL}/chatbot/messages/${ticketId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages); // Load history
        }
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [ticketId]);

  const handleSend = () => {
    if (!newMsg.trim()) return;

    // Optimistically add user message
    setMessages((prev) => [...prev, { from: "user", message: newMsg }]);
    const currentMsg = newMsg;
    setNewMsg("");

    if (step === "askEmail") {
      // Verify user by email
      fetch(`${SOCKET_URL}/chatbot/verify-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentMsg }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.exists) {
            setUserId(data.userId);
            localStorage.setItem("chatUser", JSON.stringify({ userId: data.userId, name: data.name }));
            // useEffect will trigger and check for active ticket
          } else {
            setMessages((prev) => [...prev, { from: "bot", message: "❌ User not found. Please check your email." }]);
          }
        })
        .catch((err) => console.error(err));
    }
    else if (step === "askSubject") {
      setSubject(currentMsg);
      setStep("query");
      setMessages((prev) => [...prev, { from: "bot", message: `Subject set: "${currentMsg}". How can we help you?` }]);
    }
    else if (step === "query") {
      // Send user query to backend
      fetch(`${SOCKET_URL}/chatbot/send-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: currentMsg, subject }), // Send subject if new
      })
        .then((res) => res.json())
        .then((data) => {
          // If no ticketId, use new one
          if (!ticketId && data.ticketId) {
            setTicketId(data.ticketId);
            socket.emit("joinRoom", `ticket_${data.ticketId}`);
          }

          socket.emit("userMessage", { ticketId: data.ticketId, message: currentMsg, sender: "user" });
        })
        .catch((err) => console.error(err));
    }
  };

  const handleEndChat = () => {
    setMessages([]);
    setTicketId(null);
    setUserId(null);
    localStorage.removeItem("chatUser");
    setStep("welcome");
    setShowConfirm(false);
    setOpen(false);
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setTicketId(null);
    setSubject("");
    // If user is logged in, skip email, go to subject
    if (userId) {
      setStep("askSubject");
      setMessages([{ from: "bot", message: "Please enter a subject for your new support ticket." }]);
    } else {
      setStep("askEmail");
      setMessages([{ from: "bot", message: "👋 Hi! Welcome. Can I have your email?" }]);
    }
  };

  return (
    <div className={`chatbot-widget ${open ? "open" : ""}`}>
      <div className="chatbot-header" onClick={() => setOpen(!open)}>
        {open ? "Chat with us" : "💬 Chat"}
        {open && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(true);
            }}
            style={{ cursor: "pointer", fontWeight: "bold", fontSize: "18px", marginLeft: "10px" }}
          >
            &times;
          </span>
        )}
      </div>

      {open && (
        <div className="chatbot-body">
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chatbot-message ${m.from === "bot" || m.from === "admin"
                  ? "bot"
                  : m.from === "system"
                    ? "system"
                    : "user"
                  }`}
              >
                <b>{m.from}:</b> {m.message}
              </div>
            ))}
            {typing && <div className="chatbot-message bot"><i>Admin is typing...</i></div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            {step === "closed" ? (
              <button onClick={handleStartNewChat} style={{ width: "100%" }}>Start New Ticket</button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={step === "askSubject" ? "Enter Ticket Subject..." : "Type your message..."}
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
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
              </>
            )}
          </div>

          {showConfirm && (
            <div className="chatbot-confirm">
              <p>Are you sure you want to end the chat?</p>
              <button onClick={handleEndChat}>Yes</button>
              <button onClick={() => setShowConfirm(false)}>No</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Chatbot;
