// quiz.js

const { useState, useEffect } = React;

function QuizApp() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  // 'not_started', 'loading', 'active', 'finished'
  const [quizState, setQuizState] = useState('not_started');
  const [feedback, setFeedback] = useState(''); // Correct/Incorrect feedback

  // On page load, get the topic from the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicFromUrl = urlParams.get('topic');
    setTopic(topicFromUrl || 'General Knowledge');

    // Add event listener for exiting fullscreen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (quizState === 'active') {
          setQuizState('finished'); // End quiz if user exits fullscreen
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [quizState]);

  const startQuiz = async () => {
    // 1. Enter fullscreen
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
    
    // 2. Fetch questions from AI
    setQuizState('loading');
    try {
        const response = await fetch('http://localhost:5000/generate_quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
        });
        if (!response.ok) throw new Error('Failed to generate quiz');
        const data = await response.json();
        setQuestions(data.questions);
        setQuizState('active');
    } catch(err) {
        setQuizState('error');
    }
  };

  const handleAnswer = (selectedOption) => {
    if (feedback) return; // Prevent multiple clicks

    if (selectedOption === questions[currentQuestionIndex].answer) {
        setFeedback('Correct!');
        setScore(s => s + 1);
    } else {
        setFeedback('Incorrect!');
    }

    // Move to next question after a short delay
    setTimeout(() => {
        setFeedback('');
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            setQuizState('finished');
        }
    }, 1500);
  };

  const renderContent = () => {
    switch(quizState) {
        case 'loading':
            return <div className="quiz-container"><h1>Generating your quiz...</h1></div>;
        case 'error':
            return <div className="quiz-container"><h1>Failed to generate quiz. Please try again.</h1></div>;
        case 'active':
            const currentQuestion = questions[currentQuestionIndex];
            return (
                <div className="quiz-container flashcard">
                    <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
                    <p className="question-text">{currentQuestion.question}</p>
                    <div className="options-grid">
                        {currentQuestion.options.map((option, index) => {
                            let buttonClass = 'option-button';
                            if (feedback && option === currentQuestion.answer) {
                                buttonClass += ' correct';
                            } else if (feedback && option !== currentQuestion.answer) {
                                buttonClass += ' incorrect';
                            }
                            return (
                                <button key={index} className={buttonClass} onClick={() => handleAnswer(option)}>
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                    {feedback && <p className="feedback-text">{feedback}</p>}
                </div>
            );
        case 'finished':
            return (
                <div className="quiz-container">
                    <h1>Quiz Finished!</h1>
                    <p className="score-text">Your Score: {score} / {questions.length}</p>
                    <button className="start-button" onClick={() => window.location.reload()}>Try Again</button>
                </div>
            );
        case 'not_started':
        default:
            return (
                <div className="quiz-container">
                    <h1>{topic} Quiz</h1>
                    <button className="start-button" onClick={startQuiz}>Start Quiz</button>
                </div>
            );
    }
  };

  return <div className="quiz-page">{renderContent()}</div>;
}

const container = document.getElementById('quiz-root');
const root = ReactDOM.createRoot(container);
root.render(<QuizApp />);