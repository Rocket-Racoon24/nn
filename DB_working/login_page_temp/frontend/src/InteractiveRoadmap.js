// src/InteractiveRoadmap.js
import React, { useState } from 'react';
import './styles/Roadmap.css'; // Uses the same styles as the generator

// This sub-component fetches and displays the deep-dive HTML details.
function StudyItem({ item, topicTitle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subDetails, setSubDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
  // Case 1: If the section is already open, just close it.
  if (isExpanded) {
    setIsExpanded(false);
    return;
  }

  // Case 2: If it's closed but we already have the data, just re-open it.
  if (subDetails) {
    setIsExpanded(true);
    return;
  }

  // Case 3: If it's already loading, do nothing.
  if (isLoading) {
    return;
  }

  // Case 4: If we have no data and are not loading, fetch it for the first time.
  setIsLoading(true);
  setError('');
  try {
    const token = localStorage.getItem('token');
    
    // First check if we have saved sub-details
    const savedResponse = await fetch(`http://localhost:5000/get_notes?topic=${encodeURIComponent(topicTitle)}&note_type=sub_details`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (savedResponse.ok) {
      const savedData = await savedResponse.json();
      const savedNote = savedData.notes.find(note => note.metadata && note.metadata.term === item.term);
      if (savedNote) {
        setSubDetails(savedNote.content);
        setIsExpanded(true);
        setIsLoading(false);
        return;
      }
    }
    
    // If no saved sub-details, generate new ones
    const response = await fetch('http://localhost:5000/generate_sub_details', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ term: item.term, context: topicTitle }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const data = await response.json();
    setSubDetails(data.sub_details);
    setIsExpanded(true); // Open the section after fetching
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="study-item">
      <div className="study-item-header" onClick={handleClick}>
        <p><strong>{item.term}:</strong> {item.definition}</p>
        <span className={`sub-expand-icon ${isLoading ? 'loading-animation' : ''}`}>
          {!isLoading && (isExpanded ? '−' : '+')}
        </span>
      </div>
      {isExpanded && (
        <div className="sub-details-box">
          {isLoading && <p className="loading-text">Generating details...</p>}
          {error && <p className="error-text">{error}</p>}
          {subDetails && <div dangerouslySetInnerHTML={{ __html: subDetails }} />}
        </div>
      )}
    </div>
  );
}

// This component represents one of the main roadmap topics and fetches its sub-items.
function TopicCard({ topic, isExpanded, onCardClick, topicTitle }) {
  const [details, setDetails] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchDetails = async () => {
    if (details || isDetailsLoading) return;
    setIsDetailsLoading(true);
    setError('');
    try {
      // First check if we have saved details
      const token = localStorage.getItem('token');
      const savedResponse = await fetch(`http://localhost:5000/get_notes?topic=${encodeURIComponent(topic.title)}&note_type=details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.notes && savedData.notes.length > 0) {
          setDetails(savedData.notes[0].content);
          setIsDetailsLoading(false);
          return;
        }
      }
      
      // If no saved details, generate new ones
      const response = await fetch('http://localhost:5000/generate_details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: topic.title }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const data = await response.json();
      setDetails(data.details);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleHeaderClick = () => {
    onCardClick(topic.id);
    if (!isExpanded) {
      handleFetchDetails();
    }
  };

  return (
    <div className="topic-card">
      <div className="card-header clickable" onClick={handleHeaderClick}>
        <div>
          <h3>{topic.title}</h3>
          <p>{topic.description}</p>
        </div>
        <span className={`expand-icon ${isDetailsLoading ? 'loading-animation' : ''}`}>
          {!isDetailsLoading && (isExpanded ? '−' : '+')}
        </span>
      </div>
      {isExpanded && (
        <div className="topic-details">
          {isDetailsLoading && <p className="loading-text">Loading details...</p>}
          {error && <p className="error-text">{error}</p>}
          {details && details.map((section, index) => (
            <div key={index} className="study-section">
              <h3>{section.section_title}</h3>
              {section.section_items.map((item, itemIndex) => (
                <StudyItem key={itemIndex} item={item} topicTitle={topicTitle} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// This is the main component that manages the state for the interactive roadmap.
function InteractiveRoadmap({ topics, topicTitle, onNewSearch }) {
    const [expandedCardId, setExpandedCardId] = useState(null);
  
    const handleCardExpansion = (topicId) => {
      setExpandedCardId(currentId => (currentId === topicId ? null : topicId));
    };

    return (
        <div className="roadmap-display">
            <div className="header-active-roadmap">
                <h2 className="roadmap-title">Roadmap is ready..</h2>
            </div>
            <div className="topics-list">
                {topics.map((topic) => (
                    <TopicCard 
                        key={topic.id} 
                        topic={topic} 
                        isExpanded={expandedCardId === topic.id}
                        onCardClick={handleCardExpansion}
                        topicTitle={topicTitle}
                    />
                ))}
            </div>
            <div className="quiz-assessment-box">
                <p>Assess your knowledge to track your progress.</p>
                <a href={`quiz.html?topic=${encodeURIComponent(topicTitle)}`} className="quiz-button">
                    Start Quiz
                </a>
            </div>
      </div>
    );
}

export default InteractiveRoadmap;