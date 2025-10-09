import React, { useState, useEffect, useRef } from "react";

function Home() {
  const [projects, setProjects] = useState([]);
  const [newUser, setNewUser] = useState(true);
  const [query, setQuery] = useState("");
  const [activeProject, setActiveProject] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [user, setUser] = useState(null);

  // --- NEW STATE FOR TOOLS AND SUMMARY ---
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [summaryContent, setSummaryContent] = useState(null);
  const fileInputRef = useRef(null);
  const chatbotBodyRef = useRef(null);

  // State to manage the current view
  const [currentView, setCurrentView] = useState('projects');

  // Auto-scroll chat to the bottom
  useEffect(() => {
    if (chatbotBodyRef.current) {
      chatbotBodyRef.current.scrollTop = chatbotBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch logged-in user data
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:5000/home-data", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.error("Unauthorized, logging out...");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, []);

  // Create roadmap
  const handleGenerateRoadmap = () => {
    if (!query.trim()) return;
    const newProject = {
      id: Date.now(),
      title: query,
      steps: generateDummyRoadmap(query),
    };
    setProjects([...projects, newProject]);
    setActiveProject(newProject);
    setNewUser(false);
    setQuery("");
  };

  const generateDummyRoadmap = (topic) => [
    `Introduction to ${topic}`,
    `Core Concepts of ${topic}`,
    `Intermediate Projects in ${topic}`,
    `Advanced ${topic} Techniques`,
    `Final Project: Build something with ${topic}`,
  ];

  const handleNewProject = () => {
    setActiveProject(null);
    setQuery("");
    setNewUser(false);
    // Switch back to projects view if user is in summary view
    setCurrentView('projects');
  };

  // Send message to backend chatbot
  const handleSendMessage = async () => {
    if (!chatInput.trim() && !pdfFile && !youtubeUrl.trim()) return;

    const userMsgText =
      chatInput ||
      (pdfFile ? `Summarize: ${pdfFile.name}` : `Summarize URL`);
    const userMsg = { sender: "user", text: userMsgText };
    setChatMessages((prev) => [...prev, userMsg]);

    const messageToSend = chatInput;
    const fileToSend = pdfFile;
    const urlToSend = youtubeUrl;

    setChatInput("");
    setPdfFile(null);
    setYoutubeUrl("");
    setShowToolsMenu(false);

    try {
      const formData = new FormData();
      formData.append("message", messageToSend);
      if (fileToSend) {
        formData.append("file", fileToSend);
      }
      if (urlToSend) {
        formData.append("youtube_url", urlToSend);
      }

      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to connect to chatbot");
      }

      const data = await res.json();
      const botMsg = {
        sender: "bot",
        text: data.chat_reply || "No reply received.",
      };
      setChatMessages((prev) => [...prev, botMsg]);

      // If a summary is returned, store it and automatically switch the view
      if (data.summary_content) {
        setSummaryContent(data.summary_content);
        setCurrentView('summary'); // Switch to the summary view
        setShowChatbot(false);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ Oops, I couldn’t reach the AI right now.",
        },
      ]);
    }
  };

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
    setShowToolsMenu(false);
  };

  return (
    <>
      <style>{`
        /* --- NEW STYLES FOR THE "NO SUMMARY" PLACEHOLDER --- */
        .no-summary-view {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: linear-gradient(to bottom right, #3b82f6, #8b5cf6, #4f46e5);
        }
        .no-summary-card {
          cursor: pointer;
          padding: 24px 32px;
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(4px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: all 0.5s ease-in-out;
        }
        .no-summary-card:hover {
          transform: scale(1.1);
          background-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 16px 40px 0 rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .no-summary-card h1 {
          color: white;
          font-weight: bold;
        }

        /* --- EXISTING STYLES --- */
        .summary-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1e293b;
          color: #a78bfa; /* Matches the neon purple */
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border: none;
          font-size: 20px;
          margin-right: 15px; /* Space between it and the profile icon */
          box-shadow: 0 0 6px #a78bfa66;
        }
        .summary-btn:hover {
          background: #334155;
        }
        body {
          margin: 0;
          background: #0f172a;
          color: #f1f5f9;
          font-family: "Segoe UI", sans-serif;
        }
        .home-container {
          display: flex;
          height: 100vh;
          width: 100%;
          overflow: hidden;
        }
        .sidebar {
          width: 250px;
          background: #1e293b;
          padding: 20px;
          border-right: 1px solid #334155;
          flex-shrink: 0;
        }
        .logo {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #38bdf8;
          text-shadow: 0 0 5px #38bdf8aa;
        }
        .new-project-btn {
          background: #38bdf8;
          color: #0f172a;
          border: none;
          padding: 10px;
          width: 100%;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 20px;
          font-weight: bold;
          box-shadow: 0 0 8px #38bdf866;
        }
        .new-project-btn:hover {
          background: #0ea5e9;
        }
        .recent {
          font-size: 14px;
          margin-bottom: 10px;
          color: #94a3b8;
        }
        .no-projects {
          font-size: 12px;
          color: #64748b;
        }
        .project-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .project-list li {
          padding: 10px;
          cursor: pointer;
          border-radius: 6px;
        }
        .project-list li:hover {
          background: #334155;
        }
        .project-list li.active {
          background: #38bdf8;
          color: #0f172a;
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
          position: relative;
          overflow-y: auto;
          /* Remove padding for the no-summary-view to be full screen */
        }
        main.no-padding {
          padding: 0;
        }
        .top-bar {
          display: flex;
          justify-content: flex-end;
          align-items: center; 
          margin-bottom: 20px;
        }
        .top-bar.in-summary {
            padding: 20px; /* Add padding back when inside summary */
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            z-index: 10;
        }
        .profile {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1e293b;
          color: #38bdf8;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 0 6px #38bdf866;
        }
        .profile-menu {
          position: absolute;
          top: 60px;
          right: 20px;
          background: #1e293b;
          border: 1px solid #38bdf8;
          border-radius: 8px;
          width: 150px;
          z-index: 10;
        }
        .profile-menu p {
          padding: 10px;
          margin: 0;
          cursor: pointer;
        }
        .profile-menu p:hover {
          background: #334155;
        }
        .centered {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .neon {
          color: #a78bfa;
          text-shadow: 0 0 6px #a78bfa88;
        }
        .subtitle {
          color: #cbd5e1;
        }
        .search-box,
        .search-box-small {
          display: flex;
          margin: 20px auto;
          max-width: 500px;
          width: 100%;
        }
        .search-box input,
        .search-box-small input {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px 0 0 6px;
          outline: none;
          background: #1e293b;
          color: #f1f5f9;
        }
        .search-box button,
        .search-box-small button {
          background: #a78bfa;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 0 8px #a78bfa66;
        }
        .search-box button:hover,
        .search-box-small button:hover {
          background: #8b5cf6;
        }
        .roadmap {
          margin-top: 20px;
        }
        .roadmap-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
        }
        .step-card {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #1e293b;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 0 8px #38bdf822;
        }
        .step-number {
          background: #38bdf8;
          color: #0f172a;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          box-shadow: 0 0 6px #38bdf8aa;
        }
        .chatbot {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 55px;
          height: 55px;
          background: #a78bfa;
          color: white;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 0 8px #a78bfa88;
          z-index: 21;
        }
        .chatbot-window {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 350px;
          height: 450px;
          background: #1e293b;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 12px #38bdf855;
          z-index: 20;
        }
        .chatbot-header {
          background: #38bdf8;
          color: #0f172a;
          padding: 10px;
          font-weight: bold;
          border-radius: 12px 12px 0 0;
        }
        .chatbot-body {
          flex: 1;
          padding: 10px;
          overflow-y: auto;
          font-size: 14px;
        }
        .chat-msg {
          margin: 6px 0;
          padding: 8px 12px;
          border-radius: 12px;
          max-width: 80%;
          word-wrap: break-word;
        }
        .chat-msg.user {
          background: #38bdf8;
          color: #0f172a;
          margin-left: auto;
          box-shadow: 0 0 6px #38bdf877;
        }
        .chat-msg.bot {
          background: #334155;
          color: #f1f5f9;
          margin-right: auto;
        }
        .chatbot-footer {
          display: flex;
          padding: 5px;
          gap: 5px;
          border-top: 1px solid #334155;
          position: relative;
        }
        .chatbot-footer input {
          flex: 1;
          border: none;
          padding: 10px;
          outline: none;
          background: #0f172a;
          color: white;
          border-radius: 8px;
        }
        .chatbot-footer button {
          background: #a78bfa;
          color: white;
          border: none;
          padding: 10px 15px;
          cursor: pointer;
          border-radius: 8px;
          box-shadow: 0 0 6px #a78bfa77;
        }
        .summary-view {
          padding: 1rem;
        }
        .back-btn {
          background: #334155;
          color: #f1f5f9;
          border: 1px solid #64748b;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .back-btn:hover {
          background: #475569;
        }
        .summary-content-box {
          background: #1e293b;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #334155;
        }
        .summary-text {
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #cbd5e1;
          font-family: 'Consolas', 'Menlo', monospace;
          font-size: 14px;
          line-height: 1.6;
        }
        /* ... other styles ... */
      `}</style>

      <div className="home-container">
        <aside className="sidebar">
          <h2 className="logo">🌌 NeonMind</h2>
          <button className="new-project-btn" onClick={handleNewProject}>
            + New Project
          </button>

          <h3 className="recent">RECENT PROJECTS</h3>
          {projects.length === 0 ? (
            <p className="no-projects">
              No projects yet. Start your first roadmap!
            </p>
          ) : (
            <ul className="project-list">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={activeProject?.id === p.id ? "active" : ""}
                  onClick={() => setActiveProject(p)}
                >
                  {p.title}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* The 'no-padding' class is added conditionally to allow the placeholder to be full screen */}
        <main className={`main ${currentView === 'summary' && !summaryContent ? 'no-padding' : ''}`}>
          
          {/* Top bar is always visible but has different styles when inside the full-screen placeholder */}
          <header className={`top-bar ${currentView === 'summary' && !summaryContent ? 'in-summary' : ''}`}>
            <div style={{ flex: 1 }}></div>

            {/* --- SUMMARY BUTTON - ALWAYS VISIBLE --- */}
            <button
              className="summary-btn"
              onClick={() => setCurrentView('summary')}
              title="View Summary"
            >
              📝
            </button>
            
            <div
              className="profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user ? user.name[0].toUpperCase() : "?"}
            </div>

            {showProfileMenu && (
              <div className="profile-menu">
                <p>👤 {user ? user.name : "Profile"}</p>
                <p>⚙️ Settings</p>
                <p
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                  }}
                >
                  🚪 Logout
                </p>
              </div>
            )}
          </header>

          {/* --- UPDATED CONDITIONAL VIEW LOGIC --- */}
          {currentView === 'summary' ? (
            // 1. If the current view is 'summary'
            summaryContent ? (
              // 1a. And a summary EXISTS, show it
              <div className="summary-view">
                <button className="back-btn" onClick={() => setCurrentView('projects')}>
                  &larr; Back to Projects
                </button>
                <h2 className="neon">Generated Summary</h2>
                <div className="summary-content-box">
                  <pre className="summary-text">{summaryContent}</pre>
                </div>
              </div>
            ) : (
              // 1b. And a summary DOES NOT exist, show the placeholder
              <div className="no-summary-view">
                <div className="no-summary-card">
                  <h1>There is no summary here</h1>
                </div>
              </div>
            )
          ) : (
            // 2. Otherwise, show the default projects/welcome view
            <>
              {newUser && (
                <div className="welcome centered">
                  <h1>Welcome {user ? user.name : "to"} </h1>
                  <h1><span className="neon">NeonMind</span></h1>
                  <p className="subtitle">
                    Turn any topic into a glowing learning roadmap ✨
                  </p>
                  <div className="search-box">
                    <input type="text" placeholder="What would you like to learn today?" value={query} onChange={(e) => setQuery(e.target.value)} />
                    <button onClick={handleGenerateRoadmap}>Generate Roadmap</button>
                  </div>
                </div>
              )}

              {!newUser && !activeProject && (
                <div className="centered">
                  <h2 className="neon">What do you want to study today?</h2>
                  <div className="search-box-small">
                    <input type="text" placeholder="Type your topic..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGenerateRoadmap()} />
                    <button onClick={handleGenerateRoadmap}>Generate</button>
                  </div>
                </div>
              )}

              {!newUser && activeProject && (
                <div className="roadmap">
                  <h2 className="neon">{activeProject.title} Roadmap</h2>
                  <div className="roadmap-steps">
                    {activeProject.steps.map((step, idx) => (
                      <div key={idx} className="step-card">
                        <span className="step-number">{idx + 1}</span>
                        <p>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Chatbot remains the same */}
      <div className="chatbot" onClick={() => setShowChatbot(!showChatbot)}>
        💬
      </div>

{showChatbot && (
    <div className="chatbot-window">
        {/* 1. HEADER (Should be first) */}
        <div className="chatbot-header">NeonMind Assistant</div>
        
        {/* 2. BODY (Where messages will now appear correctly) */}
        <div className="chatbot-body" ref={chatbotBodyRef}>
            {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.sender === "user" ? "user" : "bot"}`}>
                    {msg.text}
                </div>
            ))}
        </div>

        {/* 3. ATTACHMENT INDICATOR (Optional, but good to have) */}
        <div className="attachment-indicator">
            {pdfFile && <p>📄 {pdfFile.name}</p>}
            {youtubeUrl && <p>🔗 YouTube URL attached</p>}
        </div>

        {/* 4. FOOTER (The input area, should be last) */}
        <div className="chatbot-footer">
            <button className="tools-btn" onClick={() => setShowToolsMenu(!showToolsMenu)}>
            +
            </button>
            {showToolsMenu && (
            <div className="tools-menu">
                <label
                htmlFor="pdf-upload"
                className="tool-option"
                onClick={() => fileInputRef.current.click()}
                >
                📎 Upload PDF
                </label>
                <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
                />
                <div className="tool-option-url">
                <span>📺 YouTube URL</span>
                <input
                    type="text"
                    placeholder="Paste link here..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="url-input"
                />
                </div>
            </div>
            )}

            <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Send</button>
        </div>
    </div>
)}
    </>
  );
}

export default Home;