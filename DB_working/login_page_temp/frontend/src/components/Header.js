// src/components/Header.js
import React, { useState, useRef } from 'react';
import { PomodoroPanel } from '../Pomodoro'; // Assuming Pomodoro.js is in src/
import styles from './Header.module.css'; // You will need to create Header.module.css

const Header = ({ user, onShowProfile, onLogout, onToggleSummary, onShowSettings }) => {
  // State for dropdowns is now local to the Header
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const clockRef = useRef(null);  

  // This handler is now local to the Header
  const handleProfileClick = () => {
    setShowProfileMenu(false); // Close the dropdown
    onShowProfile();           // Tell Home to change the main view
  };

  return (
    <header className={styles['top-bar']}>
      <div style={{ flex: 1 }}></div>

      {/* Pomodoro logic is now contained in the Header */}
      <div
        ref={clockRef}
        title="Pomodoro Timer"
        onClick={() => setPomodoroOpen((o) => !o)}
        // A class is better for styling than inline styles
        className={styles['pomodoro-icon']} 
      >
        ⏱️
      </div>
      <PomodoroPanel isOpen={pomodoroOpen} setIsOpen={setPomodoroOpen} anchorRef={clockRef} />

      {/* Summary Button */}
      <button className={styles['summary-btn']} onClick={onToggleSummary} title="View Summary">
          📝
      </button>
      
      {/* Profile Menu Logic */}
      <div className={styles['profile']} onClick={() => setShowProfileMenu(prev => !prev)}>
          {user ? user.name[0].toUpperCase() : "?"}
      </div>
      
      {showProfileMenu && (
          <div className={styles['profile-menu']}>
            <p onClick={handleProfileClick}>👤 {user ? user.name : "Profile"}</p>
            <p onClick={() => { setShowProfileMenu(false); onShowSettings && onShowSettings(); }}>⚙️ Settings</p>
            <p onClick={onLogout}>
                🚪 Logout
            </p>
          </div>
      )}
    </header>
  );
};

export default Header;