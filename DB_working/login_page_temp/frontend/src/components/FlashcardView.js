// FlashcardView.js - Component for displaying flashcards
import React, { useState } from 'react';
import styles from './FlashcardView.module.css';

const FlashcardView = ({ flashcards, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className={styles['flashcard-container']}>
        <button className={styles['back-btn']} onClick={onBack}>
          &larr; Back to Summary
        </button>
        <div className={styles['no-cards']}>
          <p>No flashcards available.</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className={styles['flashcard-container']}>
      <button className={styles['back-btn']} onClick={onBack}>
        &larr; Back to Summary
      </button>
      
      <div className={styles['flashcard-header']}>
        <h2 className={styles['neon']}>Flashcards</h2>
        <div className={styles['progress-bar']}>
          <div 
            className={styles['progress-fill']} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className={styles['progress-text']}>
          {currentIndex + 1} / {flashcards.length}
        </p>
      </div>

      {/* --- MODIFIED: Main area now wraps nav and card --- */}
      <div className={styles['flashcard-main-area']}>
        <button 
          className={`${styles['nav-btn']} ${styles['nav-prev']}`}
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          &larr;
        </button>

        <div className={styles['flashcard-wrapper']}>
          <div 
            className={`${styles['flashcard']} ${isFlipped ? styles['flipped'] : ''}`}
            // --- MODIFIED: onClick handler removed ---
          >
            <div className={styles['flashcard-front']}>
              <div className={styles['card-label']}>Question</div>
              <div className={styles['card-content']}>
                {currentCard.question}
              </div>
              {/* --- MODIFIED: Hint text removed --- */}
            </div>
            <div className={styles['flashcard-back']}>
              <div className={styles['card-label']}>Answer</div>
              <div className={styles['card-content']}>
                {currentCard.answer}
              </div>
              {/* --- MODIFIED: Hint text removed --- */}
            </div>
          </div>
        </div>

        <button 
          className={`${styles['nav-btn']} ${styles['nav-next']}`}
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          &rarr;
        </button>
      </div>

      {/* --- MODIFIED: Controls now just for flip button --- */}
      <div className={styles['flashcard-controls']}>
        <button 
          className={styles['flip-btn']}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </button>
      </div>
    </div>
  );
};

export default FlashcardView;