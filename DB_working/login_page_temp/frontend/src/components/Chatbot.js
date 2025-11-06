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
  const textareaRef = useRef(null); // <-- ADDED: Ref for auto-growing textarea

  // Load chat memory from sessionStorage on mount
  useEffect(() => {
    // THIS IS THE CORRECT HOOK FOR TEXT SELECTION
    if (onAskFromSelection) {
      setShowChatbot(true);
      
      const formattedMessage = `explain: [${onAskFromSelection}]`;
      setChatInput(formattedMessage);
  
      // Auto-send after a brief delay
      const timer = setTimeout(() => {
        handleSendMessageWithText(formattedMessage);
      }, 100);
  
      return () => clearTimeout(timer);
    }
  }, [onAskFromSelection]); // eslint-disable-line react-hooks/exhaustive-deps
  

  // Save chat memory to sessionStorage whenever messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      sessionStorage.setItem('chatbot_memory', JSON.stringify({
        messages: chatMessages,
        timestamp: Date.now()
      }));
    }
  }, [chatMessages]);

  // Clear memory on logout (listen for logout event)
  useEffect(() => {
    const handleLogout = () => {
      sessionStorage.removeItem('chatbot_memory');
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

  // --- ADDED: Auto-resize textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to shrink
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to new scroll height
    }
  }, [chatInput]);

  // Send message with optional text parameter (for text selection)
  // --- MODIFIED: Cleaned up input clearing logic ---
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

    // --- NEW LOGIC: Clear inputs *after* grabbing their values ---
    if (messageText.trim()) {
      setChatInput(""); // Clear text input
    }
    if (pdfFiles.length > 0) {
      setPdfFiles([]); // Clear files
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setShowToolsMenu(false); // Always close tools menu

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

  // --- DELETED: Removed redundant useEffect for onAskFromSelection ---
  // (The duplicate block from lines 109-119 was removed)

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
                
                {/* --- MODIFIED: Replaced <input> with <textarea> --- */}
                <textarea
                  ref={textareaRef}
                  rows="1"
                  className={styles['chat-input']}
                  placeholder="Ask something..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    // Send on Enter, but allow Shift+Enter for new line
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); // Prevent default (new line)
                      handleSendMessage();
                    }
                  }}
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