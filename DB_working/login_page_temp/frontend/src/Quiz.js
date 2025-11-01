// src/Quiz.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './styles/Quiz.css';

function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState('');
  const [mainTopic, setMainTopic] = useState('');
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [view, setView] = useState('start'); // 'start', 'loading', 'quiz', 'results'
  const [numQuestions, setNumQuestions] = useState(10);
  const [quizType, setQuizType] = useState('MCQ');
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqTotal, setMcqTotal] = useState(0);
  const [descriptiveScore, setDescriptiveScore] = useState(0);
  const [descriptiveTotal, setDescriptiveTotal] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const mainTopicParam = searchParams.get('mainTopic');
    
    if (topicParam) {
      setTopic(topicParam);
    }
    if (mainTopicParam) {
      setMainTopic(mainTopicParam);
    } else {
      // Try to get from sessionStorage
      const savedMainTopic = sessionStorage.getItem('roadmapQuery');
      if (savedMainTopic) {
        setMainTopic(savedMainTopic);
      }
    }
  }, [searchParams]);

  const handleStartQuiz = async () => {
    if (!topic) {
      alert("Error: No topic found. Returning to roadmap.");
      navigate('/home');
      return;
    }

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
          num_questions: parseInt(numQuestions),
          quiz_type: quizType
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
      alert(err.message);
      setView('start');
    }
  };

  const handleSubmitQuiz = async () => {
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
        const textarea = document.querySelector(`#answer-${index}`);
        if (textarea) {
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
      alert("Please provide an answer for at least one descriptive question.");
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
        setDescriptiveScore(descriptiveScoreCount);
        setDescriptiveTotal(descriptiveTotalCount);
      } catch (err) {
        alert(err.message);
        return;
      }
    }

    // Update state and show results
    setMcqScore(mcqScoreCount);
    setMcqTotal(mcqTotalCount);
    showResults(mcqScoreCount, mcqTotalCount, descriptiveScoreCount, descriptiveTotalCount);
  };

  const showResults = (mcqScoreCount, mcqTotalCount, descriptiveScoreCount, descriptiveTotalCount) => {
    // Calculate final scores
    const finalScore = mcqScoreCount + descriptiveScoreCount;
    const finalTotal = mcqTotalCount + descriptiveTotalCount;
    
    setView('results');
    
    let feedbackText = "";
    if (mcqTotalCount > 0) feedbackText += `MCQ: ${mcqScoreCount}/${mcqTotalCount}. `;
    if (descriptiveTotalCount > 0) feedbackText += `Descriptive: ${descriptiveScoreCount}/${descriptiveTotalCount}. `;
    
    const percentage = finalTotal > 0 ? (finalScore / finalTotal) * 100 : 0;
    if (percentage === 100) {
      feedbackText += "Perfect Score! Excellent work!";
    } else if (percentage > 80) {
      feedbackText += "Excellent work!";
    } else if (percentage > 50) {
      feedbackText += "Good job, keep reviewing!";
    } else {
      feedbackText += "Keep practicing!";
    }
    
    setFeedback(feedbackText);

    // Mark as complete if 100% and save to localStorage
    if (finalScore === finalTotal && finalTotal > 0 && mainTopic && topic) {
      try {
        const completionData = JSON.parse(localStorage.getItem('roadmapCompletion')) || {};
        
        if (!completionData[mainTopic]) {
          completionData[mainTopic] = { totalModules: 0, completedModules: [] };
        }
        
        const completed = new Set(completionData[mainTopic].completedModules || []);
        completed.add(topic);
        completionData[mainTopic].completedModules = [...completed];
        localStorage.setItem('roadmapCompletion', JSON.stringify(completionData));
      } catch (err) {
        console.error("Failed to save completion status:", err);
      }
    }
  };

  const handleRetakeQuiz = () => {
    setView('start');
    setCurrentQuestions([]);
    setMcqScore(0);
    setMcqTotal(0);
    setDescriptiveScore(0);
    setDescriptiveTotal(0);
    setFeedback('');
  };

  const handleCancel = () => {
    navigate('/home');
  };


  return (
    <div className="quiz-container">
      {view === 'start' && (
        <div className="quiz-start-view">
          <h1 className="quiz-topic-title">Quiz: {topic || 'Loading Topic...'}</h1>
          <p>Select your quiz options:</p>
          <div className="start-options">
            <select 
              id="quiz-type"
              value={quizType}
              onChange={(e) => setQuizType(e.target.value)}
            >
              <option value="MCQ">MCQ Only</option>
              <option value="Descriptive">Descriptive Only</option>
              <option value="Both">MCQ & Descriptive</option>
            </select>
            <select 
              id="num-questions"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
            >
              <option value="5">5 Questions</option>
              <option value="10">10 Questions</option>
              <option value="20">20 Questions</option>
            </select>
          </div>
          <button className="start-quiz-button" onClick={handleStartQuiz}>
            Start Quiz
          </button>
        </div>
      )}

      {view === 'loading' && (
        <div className="quiz-loading-view">
          <p className="loading-text">Generating your quiz...</p>
        </div>
      )}

      {view === 'quiz' && (
        <div className="quiz-view">
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
          <button className="cancel-quiz-button secondary-button" onClick={handleCancel}>
            Cancel Quiz
          </button>
          <button className="submit-quiz-button" onClick={handleSubmitQuiz}>
            Submit
          </button>
        </div>
      )}

      {view === 'results' && (
        <div className="quiz-results-view">
          <h2 className="score-text">
            Your Score: {mcqScore + (descriptiveScore || 0)} / {mcqTotal + (descriptiveTotal || 0)}
          </h2>
          <p className="feedback-text">{feedback}</p>
          <button className="retake-quiz-button" onClick={handleRetakeQuiz}>
            Take Another Quiz
          </button>
        </div>
      )}
    </div>
  );
}

export default Quiz;

