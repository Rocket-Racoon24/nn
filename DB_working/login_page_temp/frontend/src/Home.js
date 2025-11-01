// src/Home.js (Fully Restored with Chatbot and Multi-Project Logic)
import React, { useState, useEffect, useRef } from "react";
import RoadmapGenerator from './RoadmapGenerator';
import InteractiveRoadmap from './InteractiveRoadmap';
import styles from './Home.module.css';
import { Profile } from "./profile";
import Pomodoro from './Pomodoro';
import { PomodoroPanel } from "./Pomodoro";

function Home() {
  // --- General State ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [summaryContent, setSummaryContent] = useState(null);
  const [currentView, setCurrentView] = useState('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // --- Roadmap State ---
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

// --- Pomodoro State ---
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const clockRef = useRef(null);  

  // --- Chatbot State (Restored) ---
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [pdfFiles, setPdfFiles] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const fileInputRef = useRef(null);
  const chatbotBodyRef = useRef(null);

  // --- UseEffects ---
  useEffect(() => {
    if (chatbotBodyRef.current) {
      chatbotBodyRef.current.scrollTop = chatbotBodyRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5000/home-data", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        } else {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      } catch (err) { console.error("Error fetching user data:", err); }
    };
    fetchUserData();
  }, []);

  // --- Roadmap Functions ---
  const handleRoadmapGenerated = (newRoadmap) => {
    const project = { ...newRoadmap, id: Date.now() };
    setProjects(prevProjects => [...prevProjects, project]);
    // The line below should be removed or commented out
    // setActiveProjectId(project.id); 
};
  const handleNewProject = () => {
  setCurrentView('projects');
  setActiveProjectId(null);
};

const handleShowProfile = () => {
  setShowProfileMenu(false); // This closes the dropdown menu
  setCurrentView('profile');   // This switches the main view to 'profile'
};

  // --- Chatbot Functions (Restored) ---
  const handleSendMessage = async () => {
    if (!chatInput.trim() && pdfFiles.length === 0 && !youtubeUrl.trim()) return;
    const userMsgText = chatInput || (pdfFiles.length > 0 ? `${pdfFiles.length} file(s) attached` : `URL: ${youtubeUrl}`);
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsgText }]);
    
    const formData = new FormData();
    formData.append("message", chatInput);
    if (pdfFiles.length > 0) { for (const file of pdfFiles) { formData.append("files", file); } }
    if (youtubeUrl) formData.append("youtube_url", youtubeUrl);

    setChatInput("");
    setPdfFiles([]);
    setYoutubeUrl("");
    setShowToolsMenu(false);

    try {
      const res = await fetch("http://localhost:5000/ask", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to connect to chatbot");
      const data = await res.json();
      setChatMessages((prev) => [...prev, { sender: "bot", text: data.chat_reply }]);
      if (data.summary_content) {
        setSummaryContent(data.summary_content);
        setCurrentView('summary');
        setShowChatbot(false);
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

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      <div className={styles['home-container']}>
        <aside className={`${styles['sidebar']} ${!isSidebarOpen ? styles['sidebar-collapsed'] : ''}`} aria-expanded={isSidebarOpen}>
          <button className={styles['sidebar-toggle']} onClick={() => setIsSidebarOpen(prev => !prev)} title={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <h2 className={styles['logo']}>🌌 NeonMind</h2>
          
    <button className={styles['new-project-btn']} onClick={handleNewProject}>
        + New Project
    </button>
    <h3 className={styles['recent']}>RECENT PROJECTS</h3>
          {projects.length > 0 ? (
            <ul className={styles['project-list']}>
              {projects.map(p => (
                <li key={p.id} className={activeProjectId === p.id ? styles['active'] : undefined} onClick={() => setActiveProjectId(p.id)}>
                  {p.topic}
                </li>
              ))}
            </ul>
          ) : (<p className={styles['no-projects']}>Generate a new roadmap.</p>)}
        </aside>

        <main className={styles['main']}>
          <header className={styles['top-bar']}>
            <div style={{ flex: 1 }}></div>
<div
  ref={clockRef}
  title="Pomodoro Timer"
  onClick={() => setPomodoroOpen((o) => !o)}
  style={{
    display: 'inline-block',
    marginRight: 16,
    cursor: 'pointer',
    fontSize: 22,
    userSelect: 'none',
    verticalAlign: 'middle',
  }}
>
  ⏱️
</div>
<PomodoroPanel isOpen={pomodoroOpen} setIsOpen={setPomodoroOpen} anchorRef={clockRef} />


<button className={styles['summary-btn']} onClick={() => setCurrentView(prev => prev === 'summary' ? 'projects' : 'summary')} title="View Summary">
    📝
</button>
<div className={styles['profile']} onClick={() => setShowProfileMenu(!showProfileMenu)}>
    {user ? user.name[0].toUpperCase() : "?"}
</div>
{showProfileMenu && (
    <div className={styles['profile-menu']}>
    <p onClick={handleShowProfile}>👤 {user ? user.name : "Profile"}</p>
    <p>⚙️ Settings</p>
    <p onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}>
        🚪 Logout
    </p>
    </div>
)}
          </header>

          {currentView === 'profile' ? (
  <Profile 
    onBack={() => setCurrentView('projects')} 
    topics={projects.map(p => p.topic)} 
    user={user} 
  />
) : currentView === 'projects' ? (
  activeProjectId && activeProject ? (
    <InteractiveRoadmap 
      topics={activeProject.topics} 
      topicTitle={activeProject.topic} 
      onNewSearch={handleNewProject} 
    />
  ) : (
    <RoadmapGenerator onRoadmapGenerated={handleRoadmapGenerated} />
  )
) : (
    summaryContent ? (
        <div className="summary-view">
            <button className={styles['back-btn']} onClick={() => setCurrentView('projects')}>
                &larr; Back to Projects
            </button>
            <h2 className={styles['neon']}>Generated Summary</h2>
            <div className={styles['summary-content-box']}>
                <pre className={styles['summary-text']}>{summaryContent}</pre>
            </div>
        </div>
    ) : (
        <div className={styles['no-summary-view']}>
            <div className={styles['no-summary-card']}>
                <h1>Create a summary to see it here...</h1>
            </div>
        </div>
    )
)}
        </main>
      </div>

      {/* --- Full Chatbot UI (Restored) --- */}
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
}

export default Home;