// src/components/Sidebar.js
import React from 'react';
import styles from './Sidebar.module.css'; // You will need to create Sidebar.module.css

const Sidebar = ({ isOpen, onToggle, projects, activeProjectId, onSelectProject, onNewProject }) => {
  return (
    <aside className={`${styles['sidebar']} ${!isOpen ? styles['sidebar-collapsed'] : ''}`} aria-expanded={isOpen}>
      <button className={styles['sidebar-toggle']} onClick={onToggle} title={isOpen ? 'Hide sidebar' : 'Show sidebar'}>
        {isOpen ? '◀' : '▶'}
      </button>
      <h2 className={styles['logo']}>🌌 NeonMind</h2>
      
      <button className={styles['new-project-btn']} onClick={onNewProject}>
          + New Project
      </button>
      <h3 className={styles['recent']}>RECENT PROJECTS</h3>
      {projects.length > 0 ? (
        <ul className={styles['project-list']}>
          {projects.map(p => (
            <li 
              key={p.id} 
              className={activeProjectId === p.id ? styles['active'] : undefined} 
              onClick={() => onSelectProject(p.id)}
            >
              {p.topic}
            </li>
          ))}
        </ul>
      ) : (<p className={styles['no-projects']}>Generate a new roadmap.</p>)}
    </aside>
  );
};

export default Sidebar;