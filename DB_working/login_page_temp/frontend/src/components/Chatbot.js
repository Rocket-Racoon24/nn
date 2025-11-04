// src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './Chatbot.module.css'; // You will need to create Chatbot.module.css

const Chatbot = ({ onSummaryGenerated, onAskFromSelection }) => {
  // All chatbot state is now local to this component
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [pdfFiles, setPdfFiles] = useState([]);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const fileInputRef = useRef(null);
  const chatbotBodyRef = useRef(null);

  // Load chat memory from localStorage on mount
  useEffect(() => {
    const savedMemory = localStorage.getItem('chatbot_memory');
    if (savedMemory) {
      try {
        const memory = JSON.parse(savedMemory);
        if (memory.messages && memory.messages.length > 0) {
          setChatMessages(memory.messages);
        }
      } catch (e) {
        console.error('Error loading chatbot memory:', e);
      }
    }
  }, []);

  // Save chat memory to localStorage whenever messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('chatbot_memory', JSON.stringify({
        messages: chatMessages,
        timestamp: Date.now()
      }));
    }
  }, [chatMessages]);

  // Clear memory on logout (listen for logout event)
  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem('chatbot_memory');
      setChatMessages([]);
    };
    
    // Listen for custom logout event
    window.addEventListener('userLogout', handleLogout);
    return () => window.removeEventListener('userLogout', handleLogout);
  }, []);

  // This effect is also local
  useEffect(() => {
    if (chatbotBodyRef.current) {
      chatbotBodyRef.current.scrollTop = chatbotBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Send message with optional text parameter (for text selection)
  const handleSendMessageWithText = async (textToSend = null) => {
    const messageText = textToSend || chatInput;
    if (!messageText.trim() && pdfFiles.length === 0) return;
    
    const userMsgText = messageText || (pdfFiles.length > 0 ? `${pdfFiles.length} file(s) attached` : "");
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsgText }]);
    
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("message", messageText);
    
    // Get conversation history for context
    const conversationHistory = chatMessages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    formData.append("conversation_history", JSON.stringify(conversationHistory));
    
    if (pdfFiles.length > 0) { for (const file of pdfFiles) { formData.append("files", file); } }

    if (!textToSend) {
      setChatInput("");
      setPdfFiles([]);
      setShowToolsMenu(false);
      
      // Reset file input to allow uploading again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    try {
      const res = await fetch("http://localhost:5000/ask", { 
        method: "POST", 
        headers: { Authorization: `Bearer ${token}` },
        body: formData 
      });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 503) {
          setChatMessages((prev) => [...prev, { sender: "bot", text: "AI is offline. Please start the LLM server on port 8080 and try again." }]);
        } else {
          throw new Error(errorData.error || "Failed to connect to chatbot");
        }
        return;
      }
      const data = await res.json();
      setChatMessages((prev) => [...prev, { sender: "bot", text: data.chat_reply }]);
      
      // *** THIS IS THE KEY CHANGE ***
      // Instead of setting Home's state, it calls the prop
      if (data.summary_content) {
        onSummaryGenerated(data.summary_content);
        setShowChatbot(false); // Optionally close chatbot
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "bot", text: `⚠️ ${err.message || "Oops, AI connection failed."}` }]);
    }
  };

  // All handlers are moved inside
  const handleSendMessage = () => {
    handleSendMessageWithText();
  };

  // Handle external ask from text selection
  useEffect(() => {
    if (onAskFromSelection) {
      setShowChatbot(true);
      setChatInput(onAskFromSelection);
      // Auto-send after a brief delay
      const timer = setTimeout(() => {
        handleSendMessageWithText(onAskFromSelection);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [onAskFromSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e) => { 
    setPdfFiles(prev => [...prev, ...e.target.files])
    setShowToolsMenu(false);
  };

  const handleRemoveFile = (fileNameToRemove) => {
    setPdfFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
  };

  return (
    <>
      <div className={styles['chatbot']} onClick={() => setShowChatbot(!showChatbot)}>💬</div>
      {showChatbot && (
         <div className={styles['chatbot-window']}>
             <div className={styles['chatbot-header']}>Xiao (✿◠‿◠)</div>
             <div className={styles['chatbot-body']} ref={chatbotBodyRef}>
                 {chatMessages.map((msg, i) => (
                     <div key={i} className={`${styles['chat-msg']} ${msg.sender === 'user' ? styles['user'] : styles['bot']}`}>
                         {msg.text}
                     </div>
                 ))}
             </div>
             {pdfFiles.length > 0 && (
              <div className={styles['attachment-indicator']}>
                {pdfFiles.map(file => (
                  <div key={file.name} className={styles['attachment-item']}>
                    <span>📄 {file.name}</span>
                    <button onClick={() => handleRemoveFile(file.name)} className={styles['remove-file-btn']}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles['chatbot-footer-container']}>
              {showToolsMenu && (
                <div className={styles['tools-menu']}>
                  <label className={styles['tool-option']} onClick={() => fileInputRef.current.click()}>
                    📄 Upload PDF
                  </label>
                </div>
              )}
              <div className={styles['chatbot-footer']}>
                <input
                  type="file" multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".pdf"
                />
                <button className={styles['tool-btn']} onClick={() => setShowToolsMenu(!showToolsMenu)}>+</button>
                <input
                  type="text"
                  className={styles['chat-input']}
                  placeholder="Ask something..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className={styles['send-btn']} onClick={handleSendMessage}>➤</button>
              </div>
            </div>
         </div>
      )}
    </>
  );
};

export default Chatbot;