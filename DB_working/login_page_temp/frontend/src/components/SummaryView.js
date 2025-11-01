// src/components/SummaryView.js
import React from 'react';
import styles from './SummaryView.module.css'; // You will need to create SummaryView.module.css

const SummaryView = ({ summaryContent, onBack }) => {
  return (
    summaryContent ? (
        // Use module styles for consistency
        <div className={styles['summary-view']}> 
            <button className={styles['back-btn']} onClick={onBack}>
                &larr; Back to Projects
            </button>
            <h2 className={styles['neon']}>Generated Summary</h2>
            <div className={styles['summary-content-box']}>
                <pre className={styles['summary-text']}>{summaryContent}</pre>
            </div>
        </div>
    ) : (
        <div className={styles['no-summary-view']}>
            <div className={styles['no-summary-card']}>
                <h1>Create a summary to see it here...</h1>
            </div>
        </div>
    )
  );
};

export default SummaryView;