
import React, { useState, useEffect } from "react";
import RoadmapGenerator from './RoadmapGenerator';
import InteractiveRoadmap from './InteractiveRoadmap';
import { Profile } from "./profile";
import styles from './Home.module.css';

// Import the new components
import Sidebar from './components/Sidebar';
import Settings from './Settings';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import SummaryView from './components/SummaryView';
import LoadingScreen from './components/LoadingScreen';
import ConfirmDialog from './components/ConfirmDialog';
import Toast from './components/Toast';

function Home() {
  // --- General State (Managed by Home) ---
  const [user, setUser] = useState(null);
  const [summaryContent, setSummaryContent] = useState(null);
  const [currentView, setCurrentView] = useState('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [askFromSelection, setAskFromSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  
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
      } finally {
        setIsLoading(false);
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
      // Use the topic from newRoadmap (which should be the corrected topic from backend)
      const correctedTopic = newRoadmap.topic;
      const existingIndex = prevProjects.findIndex(p => p.topic === correctedTopic || p.topic === newRoadmap.originalTopic);
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

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    setCurrentView('projects'); // Always switch to projects view when selecting a roadmap
  };

  const handleDeleteProject = (topic) => {
    setConfirmDialog({
      title: 'Delete Roadmap',
      message: `Are you sure you want to delete the "${topic}" roadmap? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        if (!token || !topic) return;
        try {
          const res = await fetch("http://localhost:5000/delete_roadmap", {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topic })
          });
          if (res.ok) {
            setProjects(prev => prev.filter(p => p.topic !== topic));
            if (activeProjectId) {
              const active = projects.find(p => p.id === activeProjectId);
              if (active && active.topic === topic) {
                setActiveProjectId(null);
                setCurrentView('projects');
              }
            }
            setToast({
              message: `Roadmap "${topic}" deleted successfully`,
              type: 'success'
            });
          }
        } catch (e) {
          console.error('Failed to delete roadmap:', e);
          setToast({
            message: 'Failed to delete roadmap',
            type: 'error'
          });
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleShowSettings = () => {
    setCurrentView('settings');
  };

  const handleLogout = () => {
    // Dispatch event to clear chatbot memory
    window.dispatchEvent(new CustomEvent('userLogout'));
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

  // Handle Ask Xiao from text selection
  useEffect(() => {
    const handleAskXiaoEvent = (event) => {
      setAskFromSelection(event.detail);
      // Reset after a moment to allow re-triggering
      setTimeout(() => setAskFromSelection(null), 100);
    };
    
    window.addEventListener('askXiao', handleAskXiaoEvent);
    return () => window.removeEventListener('askXiao', handleAskXiaoEvent);
  }, []);

  // --- Derived State ---
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <>
      {isLoading && <LoadingScreen message="Loading your dashboard..." />}
      
      <div className={styles['home-container']}>
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(prev => !prev)}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
        />

        <main className={styles['main']}>
          <Header
            user={user}
            onShowProfile={handleShowProfile}
            onLogout={handleLogout}
            onToggleSummary={handleToggleSummary}
            onShowSettings={handleShowSettings}
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
                onShowToast={(toastData) => setToast(toastData)} 
              />
            ) : (
              <RoadmapGenerator onRoadmapGenerated={handleRoadmapGenerated} />
            )
          ) : currentView === 'settings' ? (
            <Settings onBack={() => setCurrentView('projects')} />
          ) : (
            <SummaryView
              summaryContent={summaryContent}
              onBack={() => setCurrentView('projects')}
            />
          )}
        </main>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDangerous={confirmDialog.isDangerous}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Chatbot is now self-contained and just needs one prop */}
      <Chatbot onSummaryGenerated={handleSummaryGenerated} onAskFromSelection={askFromSelection} />
    </>
  );
}

export default Home;