
import React, { useState, useEffect } from "react";
import RoadmapGenerator from './RoadmapGenerator';
import InteractiveRoadmap from './InteractiveRoadmap';
import { Profile } from "./profile";
import styles from './Home.module.css';

// Import the new components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import SummaryView from './components/SummaryView';

function Home() {
  // --- General State (Managed by Home) ---
  const [user, setUser] = useState(null);
  const [summaryContent, setSummaryContent] = useState(null);
  const [currentView, setCurrentView] = useState('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // --- Roadmap State (Managed by Home) ---
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

  // --- Data Fetching: User Data ---
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } 
        catch (e) { console.error("Error parsing stored user:", e); }
      }
      
      try {
        const res = await fetch("http://localhost:5000/home-data", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          } else if (data.email || data.name) {
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
          }
        } else {
          if (!storedUser) {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }
        }
      } catch (err) { 
        console.error("Error fetching user data:", err);
        if (!storedUser) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
      }
    };
    fetchUserData();
  }, []);

  // --- Data Fetching: Saved Projects ---
  useEffect(() => {
    const fetchSavedProjects = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("http://localhost:5000/get_roadmaps", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.roadmaps && Array.isArray(data.roadmaps)) {
            const loadedProjects = data.roadmaps.map((roadmap, index) => ({
              id: new Date(roadmap.created_at || Date.now()).getTime() + index,
              topic: roadmap.topic,
              topics: roadmap.roadmap_data?.topics || [],
            }));
            setProjects(loadedProjects);
          }
        } else {
          console.error("Failed to fetch projects:", res.status);
        }
      } catch (err) { 
        console.error("Error fetching saved projects:", err); 
      }
    };
    
    const timer = setTimeout(fetchSavedProjects, 100);
    return () => clearTimeout(timer);
  }, []);

  // --- Event Handlers (Passed as Props) ---
  const handleRoadmapGenerated = (newRoadmap) => {
    setProjects(prevProjects => {
      const existingIndex = prevProjects.findIndex(p => p.topic === newRoadmap.topic);
      const project = { ...newRoadmap, id: Date.now() };
      
      if (existingIndex >= 0) {
        const updated = [...prevProjects];
        updated[existingIndex] = project;
        return updated;
      } else {
        return [...prevProjects, project];
      }
    });
  };
  
  const handleNewProject = () => {
    setCurrentView('projects');
    setActiveProjectId(null);
  };

  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user"); // Also clear stored user
    window.location.href = "/login";
  };

  const handleToggleSummary = () => {
    setCurrentView(prev => prev === 'summary' ? 'projects' : 'summary');
  };
  
  // New handler to receive summary from Chatbot
  const handleSummaryGenerated = (content) => {
    setSummaryContent(content);
    setCurrentView('summary'); // Switch view to summary
  };

  // --- Derived State ---
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      <div className={styles['home-container']}>
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          onNewProject={handleNewProject}
        />

        <main className={styles['main']}>
          <Header
            user={user}
            onShowProfile={handleShowProfile}
            onLogout={handleLogout}
            onToggleSummary={handleToggleSummary}
          />

          {/* --- Main Content Area --- */}
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
            <SummaryView
              summaryContent={summaryContent}
              onBack={() => setCurrentView('projects')}
            />
          )}
        </main>
      </div>

      {/* Chatbot is now self-contained and just needs one prop */}
      <Chatbot onSummaryGenerated={handleSummaryGenerated} />
    </>
  );
}

export default Home;