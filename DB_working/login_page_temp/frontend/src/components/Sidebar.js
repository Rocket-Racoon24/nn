// src/components/Sidebar.js
import React from 'react';
import styles from './Sidebar.module.css'; // You will need to create Sidebar.module.css

const Sidebar = ({ isOpen, onToggle, projects, activeProjectId, onSelectProject, onNewProject, onDeleteProject }) => {
  const [menuProjectId, setMenuProjectId] = React.useState(null);
  const menuRef = React.useRef(null);
  const toggleMenu = (projectId) => {
    setMenuProjectId(prev => prev === projectId ? null : projectId);
  };
  const handleDelete = (e, topic) => {
    e.stopPropagation();
    setMenuProjectId(null);
    onDeleteProject && onDeleteProject(topic);
  };

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuProjectId) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuProjectId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuProjectId]);
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
              style={{ position: 'relative' }}
            >
              <span>{p.topic}</span>
              <button 
                className={styles['project-menu-btn']}
                onClick={(e) => { e.stopPropagation(); toggleMenu(p.id); }}
                title="More options"
              >
                ⋯
              </button>
              {menuProjectId === p.id && (
                <div ref={menuRef} className={styles['project-menu']} onClick={(e) => e.stopPropagation()}>
                  <button className={styles['project-delete']} onClick={(e) => handleDelete(e, p.topic)}>
                    <span className={styles['trash-icon']} aria-hidden="true">🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (<p className={styles['no-projects']}>Generate a new roadmap.</p>)}
    </aside>
  );
};

export default Sidebar;