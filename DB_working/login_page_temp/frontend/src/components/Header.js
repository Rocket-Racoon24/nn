// src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { PomodoroPanel } from '../Pomodoro'; // Assuming Pomodoro.js is in src/
import styles from './Header.module.css';

const Header = ({ user, onShowProfile, onLogout, onToggleSummary, onShowSettings }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);

  const clockRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null); // 🔧 Added clean reference for profile button

  // 🔹 Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showProfileMenu &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // 🔹 Close Pomodoro when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pomodoroOpen &&
        clockRef.current &&
        !clockRef.current.contains(event.target)
      ) {
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

  // 🔹 Handle Profile click (opens Profile view)
  const handleProfileClick = () => {
    setShowProfileMenu(false);
    onShowProfile();
  };

  return (
    <header className={styles['top-bar']}>
      <div style={{ flex: 1 }}></div>

      {/* Pomodoro Button */}
      <button
        ref={clockRef}
        title="Pomodoro Timer"
        onClick={() => setPomodoroOpen((o) => !o)}
        className={styles['pomodoro-btn']}
      >
        ⏱️
      </button>

      <div data-pomodoro-panel>
        <PomodoroPanel
          isOpen={pomodoroOpen}
          setIsOpen={setPomodoroOpen}
          anchorRef={clockRef}
        />
      </div>

      {/* Summary Button */}
      <button
        className={styles['summary-btn']}
        onClick={onToggleSummary}
        title="View Summary"
      >
        📝
      </button>

      {/* Profile Button */}
      <div
        ref={profileButtonRef}
        className={styles['profile']}
        onClick={() => setShowProfileMenu((prev) => !prev)}
      >
        {user ? user.name[0].toUpperCase() : "?"}
      </div>

      {/* Profile Dropdown Menu */}
      {showProfileMenu && (
        <div ref={profileMenuRef} className={styles['profile-menu']}>
          <p onClick={handleProfileClick}>👤 {user ? user.name : "Profile"}</p>
          <p
            onClick={() => {
              setShowProfileMenu(false);
              onShowSettings && onShowSettings();
            }}
          >
            ⚙️ Settings
          </p>
          <p onClick={onLogout}>🚪 Logout</p>
        </div>
      )}
    </header>
  );
};

export default Header;
