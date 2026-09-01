import React, { useState } from "react";
import Chatbot from "./Chatbot";
import "./ChatWidget.css";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <div className="chat-button" onClick={() => setIsOpen(true)}>
        <img
          src="https://img1.wsimg.com/dc-assets/live-engage/images/chat-baloon-dark.svg"
          alt="Contact Us"
        />
        <span>Contact Us</span>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="chat-modal">
          <div className="chat-modal-header">
            <h4>Customer Support</h4>
            <button onClick={() => setIsOpen(false)}>X</button>
          </div>
          <Chatbot onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}

export default ChatWidget;
