import React, { useEffect } from 'react';
import styles from './Toast.module.css';

const Toast = ({ 
  message, 
  type = 'success', 
  duration = 4000, 
  onClose,
  icon = null
}) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    if (icon) return icon;
    
    switch(type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ⓘ';
      default:
        return '✓';
    }
  };

  return (
    <div className={`${styles['toast']} ${styles[`toast-${type}`]}`}>
      <div className={styles['toast-content']}>
        <span className={styles['toast-icon']}>{getIcon()}</span>
        <span className={styles['toast-message']}>{message}</span>
      </div>
      <button 
        className={styles['toast-close']} 
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
