// src/Quiz.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './styles/Quiz.css';
import LoadingScreen from './components/LoadingScreen';
import ConfirmDialog from './components/ConfirmDialog';
import Toast from './components/Toast';

function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState('');
  const [mainTopic, setMainTopic] = useState('');
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [view, setView] = useState('start'); // 'start', 'loading', 'quiz', 'results', 'practice'
  const [currentQuizType, setCurrentQuizType] = useState(null); // 'mcq', 'descriptive', 'practice'
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceNumQuestions, setPracticeNumQuestions] = useState(10);
  const [practiceQuizType, setPracticeQuizType] = useState('MCQ');
  
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqTotal, setMcqTotal] = useState(0);
  const [descriptiveScore, setDescriptiveScore] = useState(0);
  const [descriptiveTotal, setDescriptiveTotal] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [lastUserAnswers, setLastUserAnswers] = useState([]);
  
  // Quiz completion status
  const [mcqPassed, setMcqPassed] = useState(false);
  const [descriptivePassed, setDescriptivePassed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);

  // Memoized loader to avoid hook dependency warnings
  const loadQuizStatus = useCallback(async () => {
    if (!topic || !mainTopic) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/get_quiz_status?topic=${encodeURIComponent(topic)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const status = Array.isArray(data.status) && data.status.length > 0 ? data.status[0] : {};
        setMcqPassed(Boolean(status.mcqPassed));
        setDescriptivePassed(Boolean(status.descriptivePassed));
      }
    } catch (err) {
      console.error("Error loading quiz status:", err);
    }
  }, [topic, mainTopic]);

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const mainTopicParam = searchParams.get('mainTopic');
    
    if (topicParam) {
      setTopic(topicParam);
    }
    if (mainTopicParam) {
      setMainTopic(mainTopicParam);
    } else {
      const savedMainTopic = sessionStorage.getItem('roadmapQuery');
      if (savedMainTopic) {
        setMainTopic(savedMainTopic);
      }
    }

    // Load quiz completion status from localStorage
    loadQuizStatus();
  }, [searchParams, loadQuizStatus]);

  

  const saveQuizStatus = (passed, quizType) => {
    if (!topic || !mainTopic) return;
    
    try {
      const quizStatus = JSON.parse(localStorage.getItem('quizStatus')) || {};
      const key = `${mainTopic}::${topic}`;
      if (!quizStatus[key]) {
        quizStatus[key] = { mcqPassed: false, descriptivePassed: false };
      }
      
      if (quizType === 'mcq') {
        quizStatus[key].mcqPassed = passed;
      } else if (quizType === 'descriptive') {
        quizStatus[key].descriptivePassed = passed;
      }
      
      localStorage.setItem('quizStatus', JSON.stringify(quizStatus));
      loadQuizStatus();
    } catch (err) {
      console.error("Error saving quiz status:", err);
    }
  };

  const handleStartMCQ = async () => {
    await handleStartQuiz('mcq', 'MCQ', 10);
  };

  const handleStartDescriptive = async () => {
    await handleStartQuiz('descriptive', 'Descriptive', 10);
  };

  const handleStartPractice = async () => {
    await handleStartQuiz('practice', practiceQuizType, parseInt(practiceNumQuestions));
    setPracticeMode(true);
  };

  const handleStartQuiz = async (type, quizTypeParam, numQuestions) => {
    if (!topic) {
      setToast({ message: "Error: No topic found. Returning to roadmap.", type: 'error' });
      navigate('/home');
      return;
    }

    setCurrentQuizType(type);
    setView('loading');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/generate_quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          topic,
          num_questions: numQuestions,
          quiz_type: quizTypeParam
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quiz.');
      }

      const data = await response.json();
      setCurrentQuestions(data.questions || []);
      setView('quiz');
    } catch (err) {
      setToast({ message: err.message || 'Failed to generate quiz.', type: 'error' });
      setView('start');
      setCurrentQuizType(null);
    }
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);


    let mcqScoreCount = 0;
    let mcqTotalCount = 0;
    const descriptiveAnswersToGrade = [];

    // Calculate scores from form inputs
    currentQuestions.forEach((question, index) => {
      if (question.type === 'mcq') {
        mcqTotalCount++;
        const selected = document.querySelector(`input[name="question-${index}"]:checked`);
        if (selected && selected.value === question.answer) {
          mcqScoreCount++;
        }
      } else if (question.type === 'descriptive') {
        const textarea = document.getElementById(`answer-${index}`);
        if (textarea && textarea.value.trim()) {
          descriptiveAnswersToGrade.push({
            question: question.question,
            user_answer: textarea.value,
            ideal_answer: question.ideal_answer
          });
        }
      }
    });

    const descriptiveTotalCount = descriptiveAnswersToGrade.length;

    // Check if all descriptive answers are empty
    const allDescriptiveEmpty = descriptiveTotalCount > 0 && 
                                descriptiveAnswersToGrade.every(a => a.user_answer.trim() === "");
    
    if (allDescriptiveEmpty) {
      setToast({ message: "Please provide an answer for at least one descriptive question.", type: 'warning' });
      setIsSubmitting(false);
      return;
    }

    // Grade descriptive answers
    let descriptiveScoreCount = 0;
    if (descriptiveTotalCount > 0 && !allDescriptiveEmpty) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/analyze_answers', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ answers: descriptiveAnswersToGrade }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze answers.');
        }

        const data = await response.json();
        descriptiveScoreCount = data.graded_answers.reduce((acc, a) => acc + a.score, 0);
      } catch (err) {
        setToast({ message: err.message || 'Failed to analyze answers.', type: 'error' });
        setIsSubmitting(false);
        return;
      }
    }

    // Update state and show results
    setMcqScore(mcqScoreCount);
    setMcqTotal(mcqTotalCount);
    setDescriptiveScore(descriptiveScoreCount);
    setDescriptiveTotal(descriptiveTotalCount);
    
    showResults(mcqScoreCount, mcqTotalCount, descriptiveScoreCount, descriptiveTotalCount);
  };

  const showResults = (mcqScoreCount, mcqTotalCount, descriptiveScoreCount, descriptiveTotalCount) => {
    setView('results');
    
    let feedbackText = "";
    const isMCQ = currentQuizType === 'mcq' || (currentQuizType === 'practice' && practiceQuizType === 'MCQ');
    const isDescriptive = currentQuizType === 'descriptive' || (currentQuizType === 'practice' && practiceQuizType === 'Descriptive');
    
    if (isMCQ && mcqTotalCount > 0) {
      const passed = mcqScoreCount >= 6;
      feedbackText = `MCQ: ${mcqScoreCount}/${mcqTotalCount}. `;
      feedbackText += passed ? "✓ Passed! (6/10 required)" : "✗ Failed! (Need 6/10 to pass)";
      
      if (!practiceMode) {
        // Save status to backend regardless of pass/fail
        (async () => {
          try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:5000/set_quiz_status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ topic, quiz_type: 'MCQ', passed })
            });
            loadQuizStatus();
          } catch {}
        })();
      }
    } else if (isDescriptive && descriptiveTotalCount > 0) {
      const passed = descriptiveScoreCount >= 6;
      feedbackText = `Descriptive: ${descriptiveScoreCount}/${descriptiveTotalCount}. `;
      feedbackText += passed ? "✓ Passed! (6/10 required)" : "✗ Failed! (Need 6/10 to pass)";
      
      if (!practiceMode) {
        (async () => {
          try {
            const token = localStorage.getItem('token');
            await fetch('http://localhost:5000/set_quiz_status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ topic, quiz_type: 'Descriptive', passed })
            });
            loadQuizStatus();
          } catch {}
        })();
      }
    } else if (currentQuizType === 'practice' && practiceQuizType === 'Both') {
      const finalScore = mcqScoreCount + descriptiveScoreCount;
      const finalTotal = mcqTotalCount + descriptiveTotalCount;
      if (mcqTotalCount > 0) feedbackText += `MCQ: ${mcqScoreCount}/${mcqTotalCount}. `;
      if (descriptiveTotalCount > 0) feedbackText += `Descriptive: ${descriptiveScoreCount}/${descriptiveTotalCount}. `;
      const percentage = finalTotal > 0 ? (finalScore / finalTotal) * 100 : 0;
      if (percentage >= 60) {
        feedbackText += "Great job!";
      } else {
        feedbackText += "Keep practicing!";
      }
    }
    
    setFeedback(feedbackText);

    // Prepare and save attempt
    const computedFinalScore = (isMCQ && !isDescriptive) ? mcqScoreCount : (isDescriptive && !isMCQ) ? descriptiveScoreCount : (mcqScoreCount + descriptiveScoreCount);
    const computedFinalTotal = (isMCQ && !isDescriptive) ? mcqTotalCount : (isDescriptive && !isMCQ) ? descriptiveTotalCount : (mcqTotalCount + descriptiveTotalCount);

    const passed = (isMCQ && !isDescriptive) ? (mcqScoreCount >= 6) : (isDescriptive && !isMCQ) ? (descriptiveScoreCount >= 6) : (computedFinalTotal > 0 ? ((computedFinalScore / computedFinalTotal) * 100) >= 60 : false);

    const quizTypeForSave = (currentQuizType === 'practice') ? practiceQuizType : (currentQuizType === 'mcq' ? 'MCQ' : 'Descriptive');

    const userAnswers = currentQuestions.map((q, index) => {
      if (q.type === 'mcq') {
        const selected = document.querySelector(`input[name="question-${index}"]:checked`);
        return { type: 'mcq', answer: selected ? selected.value : null };
      }
      const textarea = document.getElementById(`answer-${index}`);
      return { type: 'descriptive', answer: textarea ? textarea.value : '' };
    });
    setLastUserAnswers(userAnswers);

    const scores = {
      mcqScore: mcqScoreCount,
      mcqTotal: mcqTotalCount,
      descriptiveScore: descriptiveScoreCount,
      descriptiveTotal: descriptiveTotalCount,
      finalScore: computedFinalScore,
      finalTotal: computedFinalTotal,
    };

    // Save attempt (mandatory only; backend ignores practice)
    (async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:5000/save_quiz_attempt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            topic,
            quiz_type: quizTypeForSave,
            practice: currentQuizType === 'practice',
            questions: currentQuestions,
            user_answers: userAnswers,
            scores,
            passed,
          })
        });
      } catch (e) {
        // no-op
      }
    })();
  };

  const handleRetakeQuiz = () => {
    setView('start');
    setCurrentQuestions([]);
    setMcqScore(0);
    setMcqTotal(0);
    setDescriptiveScore(0);
    setDescriptiveTotal(0);
    setFeedback('');
    setCurrentQuizType(null);
    setPracticeMode(false);
    setIsSubmitting(false);
    loadQuizStatus();
  };

  const handleBackToRoadmap = () => {
    navigate('/home');
  };

  const handleBackToStart = () => {
    setView('start');
    setCurrentQuestions([]);
    setCurrentQuizType(null);
    setPracticeMode(false);
    setIsSubmitting(false);
    loadQuizStatus();
  };

  const canAccessPractice = mcqPassed && descriptivePassed;

  return (
    <div className="quiz-container">
      {/* Back to Roadmap Button - Always visible */}
      <button className="back-to-roadmap-button" onClick={handleBackToRoadmap}>
        ← Back to Roadmap
      </button>

      {view === 'start' && (
        <div className="quiz-start-view">
          <h1 className="quiz-topic-title">Quiz: {topic || 'Loading Topic...'}</h1>
          
          <div className="mandatory-quizzes">
            <h2>Mandatory Quizzes (10 questions each, 6/10 to pass)</h2>
            <div className="quiz-buttons-container">
              <button 
                className={`quiz-type-button mcq-button ${mcqPassed ? 'passed' : ''}`}
                onClick={handleStartMCQ}
                disabled={mcqPassed}
              >
                {mcqPassed ? '✓ MCQ Quiz (Passed)' : 'MCQ Quiz'}
                {mcqPassed && <span className="checkmark">✓</span>}
              </button>
              
              <button 
                className={`quiz-type-button descriptive-button ${descriptivePassed ? 'passed' : ''}`}
                onClick={handleStartDescriptive}
                disabled={descriptivePassed}
              >
                {descriptivePassed ? '✓ Descriptive Quiz (Passed)' : 'Descriptive Quiz'}
                {descriptivePassed && <span className="checkmark">✓</span>}
              </button>
            </div>
          </div>

          {canAccessPractice && (
            <div className="practice-quiz-section">
              <h2>Practice Quiz (Unlocked!)</h2>
              <p>Customize your practice quiz:</p>
              <div className="practice-options">
                <select 
                  value={practiceQuizType}
                  onChange={(e) => setPracticeQuizType(e.target.value)}
                >
                  <option value="MCQ">MCQ Only</option>
                  <option value="Descriptive">Descriptive Only</option>
                  <option value="Both">MCQ & Descriptive</option>
                </select>
                <select 
                  value={practiceNumQuestions}
                  onChange={(e) => setPracticeNumQuestions(e.target.value)}
                >
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                  <option value="15">15 Questions</option>
                  <option value="20">20 Questions</option>
                </select>
                <button className="practice-quiz-button" onClick={handleStartPractice}>
                  Start Practice Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'loading' && (
        <LoadingScreen message="Generating your quiz..." />
      )}

      {view === 'quiz' && (
        <div className="quiz-view">
          <button className="back-to-start-button" onClick={handleBackToStart}>
            ← Back to Quiz Selection
          </button>
          <div id="quiz-questions-container">
            {currentQuestions.map((q, index) => (
              <div key={index} className="question-item" data-type={q.type}>
                <p>{index + 1}. {q.question}</p>
                {q.type === 'mcq' && (
                  <div className="options-container">
                    {q.options.map((option, optIndex) => (
                      <label key={optIndex} className="option">
                        <input type="radio" name={`question-${index}`} value={option} />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === 'descriptive' && (
                  <>
                    <label htmlFor={`answer-${index}`} className="question-label">
                      Your answer please:
                    </label>
                    <textarea
                      className="descriptive-answer"
                      id={`answer-${index}`}
                      rows="4"
                      placeholder="Type your answer here..."
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <button className="submit-quiz-button" onClick={handleSubmitQuiz} disabled={isSubmitting}>
          {isSubmitting ? 'Grading...' : 'Submit'}
          </button>
        </div>
      )}

      {view === 'results' && (
        <div className="quiz-results-view">
          <h2 className="score-text">
            Your Score: {
              currentQuizType === 'mcq' || (currentQuizType === 'practice' && practiceQuizType === 'MCQ')
                ? `${mcqScore} / ${mcqTotal}`
                : currentQuizType === 'descriptive' || (currentQuizType === 'practice' && practiceQuizType === 'Descriptive')
                ? `${descriptiveScore} / ${descriptiveTotal}`
                : `${mcqScore + descriptiveScore} / ${mcqTotal + descriptiveTotal}`
            }
          </h2>
          <p className="feedback-text">{feedback}</p>
          
          {!practiceMode && (
            <div className="pass-status">
              {(currentQuizType === 'mcq' && mcqScore >= 6) || 
               (currentQuizType === 'descriptive' && descriptiveScore >= 6) ? (
                <p className="pass-message">✓ Congratulations! You passed!</p>
              ) : (
                <p className="fail-message">✗ You need 6/10 to pass. Try again!</p>
              )}
            </div>
          )}
          
          {/* Detailed question review */}
          <div className="results-detail">
            {currentQuestions.map((q, index) => {
              const ua = lastUserAnswers[index];
              const userAns = ua ? ua.answer : null;
              return (
                <div key={index} className="question-item">
                  <p><strong>{index + 1}.</strong> {q.question}</p>
                  {q.type === 'mcq' ? (
                    <ul>
                      {q.options.map((opt, i) => {
                        const isCorrect = opt === q.answer;
                        const isUser = opt === userAns;
                        return (
                          <li key={i} style={{
                            color: isCorrect ? '#00ff9c' : (isUser && !isCorrect ? '#e74c3c' : '#D6D9D8')
                          }}>
                            {opt} {isCorrect ? '✓' : ''} {isUser && !isCorrect ? '(your answer)' : ''}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div>
                      <p><strong>Your answer:</strong> {userAns || '(empty)'}</p>
                      <p><strong>Ideal answer:</strong> {q.ideal_answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="results-buttons">
            <button className="retake-quiz-button" onClick={handleRetakeQuiz}>
              {practiceMode ? 'Back to Quiz Selection' : 
               ((currentQuizType === 'mcq' && mcqScore < 6) || 
                (currentQuizType === 'descriptive' && descriptiveScore < 6)) 
               ? 'Try Again' : 'Back to Quiz Selection'}
            </button>
            <button className="back-to-roadmap-button" onClick={handleBackToRoadmap}>
              Back to Roadmap
            </button>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDangerous={confirmDialog.isDangerous}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Quiz;
