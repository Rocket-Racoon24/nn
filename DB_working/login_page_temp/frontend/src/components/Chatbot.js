// src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './Chatbot.module.css'; // You will need to create Chatbot.module.css

const Chatbot = ({ onSummaryGenerated }) => {
  // All chatbot state is now local to this component
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [pdfFiles, setPdfFiles] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const fileInputRef = useRef(null);
  const chatbotBodyRef = useRef(null);

  // This effect is also local
  useEffect(() => {
    if (chatbotBodyRef.current) {
      chatbotBodyRef.current.scrollTop = chatbotBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // All handlers are moved inside
  const handleSendMessage = async () => {
    if (!chatInput.trim() && pdfFiles.length === 0 && !youtubeUrl.trim()) return;
    const userMsgText = chatInput || (pdfFiles.length > 0 ? `${pdfFiles.length} file(s) attached` : `URL: ${youtubeUrl}`);
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsgText }]);
    
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("message", chatInput);
    if (pdfFiles.length > 0) { for (const file of pdfFiles) { formData.append("files", file); } }
    if (youtubeUrl) formData.append("youtube_url", youtubeUrl);

    setChatInput("");
    setPdfFiles([]);
    setYoutubeUrl("");
    setShowToolsMenu(false);

    try {
      const res = await fetch("http://localhost:5000/ask", { 
        method: "POST", 
        headers: { Authorization: `Bearer ${token}` },
        body: formData 
      });
      if (!res.ok) throw new Error("Failed to connect to chatbot");
      const data = await res.json();
      setChatMessages((prev) => [...prev, { sender: "bot", text: data.chat_reply }]);
      
      // *** THIS IS THE KEY CHANGE ***
      // Instead of setting Home's state, it calls the prop
      if (data.summary_content) {
        onSummaryGenerated(data.summary_content);
        setShowChatbot(false); // Optionally close chatbot
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "bot", text: "⚠️ Oops, AI connection failed." }]);
    }
  };

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
             {(pdfFiles.length > 0 || youtubeUrl) && (
              <div className={styles['attachment-indicator']}>
                {pdfFiles.map(file => (
                  <div key={file.name} className={styles['attachment-item']}>
                    <span>📄 {file.name}</span>
                    <button onClick={() => handleRemoveFile(file.name)} className={styles['remove-file-btn']}>
                      &times;
                    </button>
                  </div>
                ))}
                {youtubeUrl && <p>🔗 YouTube URL attached</p>}
              </div>
            )}
            <div className={styles['chatbot-footer-container']}>
              {showToolsMenu && (
                <div className={styles['tools-menu']}>
                  <label className={styles['tool-option']} onClick={() => fileInputRef.current.click()}>
                    📄 Upload PDF
                  </label>
                  <div className={styles['tool-option-url']}>
                    <span>🔗 YouTube URL</span>
                    <input
                      type="text"
                      className={styles['url-input']}
                      placeholder="Paste link and type a message..."
                      onBlur={(e) => setYoutubeUrl(e.target.value)}
                    />
                  </div>
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