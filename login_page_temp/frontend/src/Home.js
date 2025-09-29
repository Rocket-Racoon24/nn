// Home.js
import React, { useState, useEffect } from "react";

function Home() {
  const [projects, setProjects] = useState([]);
  const [newUser, setNewUser] = useState(true);
  const [query, setQuery] = useState("");
  const [activeProject, setActiveProject] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [user, setUser] = useState(null); // NEW: logged in user

  // Fetch logged-in user data from backend
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
          window.location.href = "/login"; // force redirect
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

  // Dummy roadmap
  const generateDummyRoadmap = (topic) => {
    return [
      `Introduction to ${topic}`,
      `Core Concepts of ${topic}`,
      `Intermediate Projects in ${topic}`,
      `Advanced ${topic} Techniques`,
      `Final Project: Build something with ${topic}`,
    ];
  };

  const handleNewProject = () => {
    setActiveProject(null);
    setQuery("");
  };

  // Chatbot
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMessage = { sender: "user", text: chatInput };
    setChatMessages([
      ...chatMessages,
      newMessage,
      { sender: "bot", text: "Got it! I'll think about that." },
    ]);
    setChatInput("");
  };

  return (
    <>
      {/* CSS injected directly */}
      <style>{`
        /* General */ 
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
        }
        .top-bar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
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
        .search-box {
          display: flex;
          margin: 20px auto;
          max-width: 500px;
          width: 100%;
        }
        .search-box input {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px 0 0 6px;
          outline: none;
        }
        .search-box button {
          background: #a78bfa;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 0 8px #a78bfa66;
        }
        .search-box button:hover {
          background: #8b5cf6;
        }
        .popular-topics {
          margin-top: 15px;
        }
        .popular-topics button {
          background: #334155;
          border: none;
          padding: 6px 12px;
          margin: 5px;
          border-radius: 20px;
          color: #f1f5f9;
          cursor: pointer;
        }
        .popular-topics button:hover {
          background: #475569;
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
        }
        .chatbot-window {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 320px;
          height: 420px;
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
          max-width: 75%;
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
          border-top: 1px solid #334155;
        }
        .chatbot-footer input {
          flex: 1;
          border: none;
          padding: 10px;
          outline: none;
          background: #0f172a;
          color: white;
        }
        .chatbot-footer button {
          background: #a78bfa;
          color: white;
          border: none;
          padding: 10px 15px;
          cursor: pointer;
          box-shadow: 0 0 6px #a78bfa77;
        }
      `}</style>

      {/* Main App Layout */}
      <div className="home-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2 className="logo">🌌 NeonMind</h2>
          <button className="new-project-btn" onClick={handleNewProject}>
            + New Project
          </button>

          <h3 className="recent">RECENT PROJECTS</h3>
          {projects.length === 0 ? (
            <p className="no-projects">No projects yet. Start your first roadmap!</p>
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

        {/* Main Content */}
        <main className="main">
          <header className="top-bar">
            <div></div>
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

          {/* Welcome screen */}
          {newUser && (
            <div className="welcome centered">
              <h1>
                Welcome {user ? user.name : "to"}{" "}
                <span className="neon">NeonMind</span>
              </h1>
              <p className="subtitle">
                Turn any topic into a glowing learning roadmap ✨
              </p>

              <div className="search-box">
                <input
                  type="text"
                  placeholder="What would you like to learn today?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button onClick={handleGenerateRoadmap}>Generate Roadmap</button>
              </div>

              <div className="popular-topics">
                <span>Popular:</span>
                {["Machine Learning", "Web Dev", "Data Science", "UI/UX"].map(
                  (topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setQuery(topic);
                        handleGenerateRoadmap();
                      }}
                    >
                      {topic}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Returning user new roadmap */}
          {!newUser && !activeProject && (
            <div className="search-box-small centered">
              <input
                type="text"
                placeholder="Start a new roadmap..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button onClick={handleGenerateRoadmap}>Generate</button>
            </div>
          )}

          {/* Roadmap display */}
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
        </main>
      </div>

      {/* Chatbot */}
      <div className="chatbot" onClick={() => setShowChatbot(!showChatbot)}>
        💬
      </div>

      {showChatbot && (
        <div className="chatbot-window">
          <div className="chatbot-header">NeonMind Assistant</div>
          <div className="chatbot-body">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg ${msg.sender === "user" ? "user" : "bot"}`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chatbot-footer">
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
