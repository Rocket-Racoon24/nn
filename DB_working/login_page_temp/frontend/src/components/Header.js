// src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { PomodoroPanel } from '../Pomodoro'; // Assuming Pomodoro.js is in src/
import styles from './Header.module.css'; // You will need to create Header.module.css

const Header = ({ user, onShowProfile, onLogout, onToggleSummary, onShowSettings }) => {
  // State for dropdowns is now local to the Header
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const clockRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        const profileButton = event.target.closest(`.${styles['profile']}`);
        if (!profileButton) {
          setShowProfileMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Close Pomodoro when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pomodoroOpen && clockRef.current && !clockRef.current.contains(event.target)) {
        const pomodoroPanel = event.target.closest('[data-pomodoro-panel]');
        if (!pomodoroPanel) {
          setPomodoroOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pomodoroOpen]);

  // This handler is now local to the Header
  const handleProfileClick = () => {
    setShowProfileMenu(false); // Close the dropdown
    onShowProfile();           // Tell Home to change the main view
  };

  return (
    <header className={styles['top-bar']}>
      <div style={{ flex: 1 }}></div>

      {/* Pomodoro logic is now contained in the Header */}
      <button
        ref={clockRef}
        title="Pomodoro Timer"
        onClick={() => setPomodoroOpen((o) => !o)}
        className={styles['pomodoro-btn']}
      >
        ⏱️
      </button>
      <div data-pomodoro-panel>
        <PomodoroPanel isOpen={pomodoroOpen} setIsOpen={setPomodoroOpen} anchorRef={clockRef} />
      </div>

      {/* Summary Button */}
      <button className={styles['summary-btn']} onClick={onToggleSummary} title="View Summary">
          📝
      </button>
      
      {/* Profile Menu Logic */}
      <div className={styles['profile']} onClick={() => setShowProfileMenu(prev => !prev)}>
          {user ? user.name[0].toUpperCase() : "?"}
      </div>
      
      {showProfileMenu && (
          <div ref={profileMenuRef} className={styles['profile-menu']}>
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