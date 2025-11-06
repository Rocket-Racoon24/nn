import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className={styles['loading-overlay']}>
      <div className={styles['loading-container']}>
        <div className={styles['spinner-wrapper']}>
          <div className={styles['spinner']}>
            <div className={styles['spinner-inner']}></div>
          </div>
        </div>
        
        <div className={styles['loading-text']}>
          <h2>{message}</h2>
          <div className={styles['dots-animation']}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className={styles['loading-bar']}>
          <div className={styles['loading-bar-fill']}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
