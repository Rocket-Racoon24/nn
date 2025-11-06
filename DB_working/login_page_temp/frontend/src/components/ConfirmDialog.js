import React from 'react';
import styles from './ConfirmDialog.module.css';

const ConfirmDialog = ({ 
  title = 'Confirm Action', 
  message = 'Are you sure?', 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false
}) => {
  return (
    <div className={styles['confirm-overlay']}>
      <div className={`${styles['confirm-dialog']} ${isDangerous ? styles['dangerous'] : ''}`}>
        <div className={styles['confirm-header']}>
          <h2>{title}</h2>
          <button className={styles['close-btn']} onClick={onCancel}>✕</button>
        </div>

        <div className={styles['confirm-content']}>
          <p>{message}</p>
        </div>

        <div className={styles['confirm-actions']}>
          <button 
            className={styles['cancel-btn']} 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className={`${styles['confirm-btn']} ${isDangerous ? styles['dangerous-btn'] : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
