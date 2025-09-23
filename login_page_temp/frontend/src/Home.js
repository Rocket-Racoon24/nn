import React, { useState } from "react";
import "./Home.module.css";

function Home() {
  const [projects, setProjects] = useState([]);
  const [newUser, setNewUser] = useState(true);
  const [query, setQuery] = useState("");
  const [activeProject, setActiveProject] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

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
              JD
            </div>

            {showProfileMenu && (
              <div className="profile-menu">
                <p>👤 Profile</p>
                <p>⚙️ Settings</p>
                <p>🚪 Logout</p>
              </div>
            )}
          </header>

          {/* Welcome screen */}
          {newUser && (
            <div className="welcome centered">
              <h1>
                Welcome to <span className="neon">NeonMind</span>
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

      {/* Chatbot (kept outside main flex layout) */}
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
