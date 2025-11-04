// src/InteractiveRoadmap.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTextSelection from './components/TextSelection';
import './styles/Roadmap.css';

// Text selection wrapper component for roadmap
const TextSelectionWrapper = ({ children }) => {
  const handleAskXiao = (selectedText) => {
    window.dispatchEvent(new CustomEvent('askXiao', { detail: selectedText }));
  };
  const { AskButton } = useTextSelection(handleAskXiao, true);
  
  return (
    <div style={{ position: 'relative' }}>
      {AskButton}
      {children}
    </div>
  );
};

// Component for displaying sub-details when a study item is clicked
function StudyItemDetail({ term, context, onBack }) {
  const [subDetails, setSubDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubDetails = async () => {
      setIsLoading(true);
      setError('');
      setSubDetails(null); // Clear previous content when loading
      try {
        const token = localStorage.getItem('token');
        
        // First check if we have saved sub-details
        const savedResponse = await fetch(
          `http://localhost:5000/get_notes?topic=${encodeURIComponent(context)}&note_type=sub_details`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (savedResponse.ok) {
          const savedData = await savedResponse.json();
          const savedNote = savedData.notes.find(
            note => note.metadata && note.metadata.term === term
          );
          if (savedNote) {
            setSubDetails(savedNote.content);
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
          body: JSON.stringify({ term, context }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 503) {
            throw new Error("AI is offline. Please start the LLM server on port 8080 and try again.");
          } else {
            throw new Error(errorData.error || "Failed to generate sub-details");
          }
        }
        const data = await response.json();
        
        // Clean the HTML response
        let htmlContent = data.sub_details.trim();
        if (htmlContent.startsWith("```html")) {
          htmlContent = htmlContent.slice(7);
        }
        if (htmlContent.endsWith("```")) {
          htmlContent = htmlContent.slice(0, -3);
        }
        htmlContent = htmlContent.trim();
        
        // Add Wikipedia link
        const encodedTerm = encodeURIComponent(term);
        const encodedContext = encodeURIComponent(context);
        const wikiLink = `https://en.wikipedia.org/w/index.php?search=${encodedTerm}+${encodedContext}`;
        
        const furtherReadingHTML = `
          <hr style="margin-top: 25px; border: 0; border-top: 1px solid rgba(0, 255, 156, 0.2);">
          <h3>Further Reading</h3>
          <p>
            <a href="${wikiLink}" target="_blank" rel="noopener noreferrer" style="color: #00ff9c; text-decoration: none;">
              &rarr; Search for "${term}" on Wikipedia
            </a>
          </p>
        `;
        
        htmlContent += furtherReadingHTML;
        setSubDetails(htmlContent);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (term && context) {
      fetchSubDetails();
    }
  }, [term, context]);

  if (!term) {
    return (
      <div className="study-item-detail-display">
        <p className="placeholder-text">Select a topic from the left to view details.</p>
      </div>
    );
  }

  return (
    <div className="study-item-detail-display" data-selectable>
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="loading-text">Generating details...</p>
          <div style={{ marginTop: '1rem' }}>⏳</div>
        </div>
      )}
      {error && !isLoading && (
        <div style={{ padding: '1rem', color: '#ef4444', textAlign: 'center' }}>
          <p className="error-text">{error}</p>
        </div>
      )}
      {!isLoading && !error && subDetails && <div dangerouslySetInnerHTML={{ __html: subDetails }} data-selectable />}
      {!isLoading && !error && !subDetails && (
        <p className="placeholder-text">Select a topic from the left to view details.</p>
      )}
    </div>
  );
}

// Study Item component for the left sidebar
function StudyItem({ item, isActive, onClick }) {
  return (
    <div 
      className={`study-item ${isActive ? 'active' : ''}`}
      data-term={item.term}
      onClick={onClick}
    >
      <div className="study-item-header">
        <p><strong>{item.term}:</strong> {item.definition}</p>
      </div>
    </div>
  );
}

// Detail View Component (master-detail layout)
function DetailView({ topicTitle, details, onBack, mainTopic }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [allStudyItems, setAllStudyItems] = useState([]);

  useEffect(() => {
    if (details && Array.isArray(details)) {
      const items = [];
      details.forEach(section => {
        if (section.section_items && Array.isArray(section.section_items)) {
          section.section_items.forEach(item => {
            items.push({ ...item, sectionTitle: section.section_title });
          });
        }
      });
      setAllStudyItems(items);
      if (items.length > 0 && !selectedTerm) {
        setSelectedTerm(items[0].term);
      }
    }
  }, [details]);

  const handleItemClick = (term) => {
    setSelectedTerm(term);
  };

  return (
    <div className="roadmap-detail-view">
      <div className="header-active-roadmap">
        <h2 className="roadmap-title">{topicTitle}</h2>
        <button className="back-to-list-button" onClick={onBack}>
          Back to Roadmap
        </button>
      </div>
      
      <div className="detail-view-content-wrapper">
        <div className="study-item-list-container">
          {details && details.map((section, sectionIndex) => (
            <div key={sectionIndex} className="study-section">
              <h3>{section.section_title}</h3>
              {section.section_items && section.section_items.map((item, itemIndex) => (
                <StudyItem
                  key={itemIndex}
                  item={item}
                  isActive={selectedTerm === item.term}
                  onClick={() => handleItemClick(item.term)}
                />
              ))}
            </div>
          ))}
        </div>
        
        <TextSelectionWrapper>
          <StudyItemDetail 
            term={selectedTerm} 
            context={mainTopic}
          />
        </TextSelectionWrapper>
      </div>
    </div>
  );
}

// Main InteractiveRoadmap Component
function InteractiveRoadmap({ topics, topicTitle, onNewSearch }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [detailsCache, setDetailsCache] = useState({});
  const [loadingTopics, setLoadingTopics] = useState(new Set());
  const [completion, setCompletion] = useState({ totalModules: topics.length, completedModules: [] });

  useEffect(() => {
    // Load completion status from localStorage
    const completionData = JSON.parse(localStorage.getItem('roadmapCompletion')) || {};
    const topicData = completionData[topicTitle];
    if (topicData) {
      setCompletion({
        totalModules: topicData.totalModules || topics.length,
        completedModules: topicData.completedModules || []
      });
    } else {
      // Initialize completion
      const newCompletionData = { ...completionData };
      newCompletionData[topicTitle] = {
        totalModules: topics.length,
        completedModules: []
      };
      localStorage.setItem('roadmapCompletion', JSON.stringify(newCompletionData));
      setCompletion({
        totalModules: topics.length,
        completedModules: []
      });
    }
  }, [topicTitle, topics.length]);

  // Update completion when localStorage changes (e.g., after quiz completion)
  useEffect(() => {
    const handleStorageChange = () => {
      const completionData = JSON.parse(localStorage.getItem('roadmapCompletion')) || {};
      const topicData = completionData[topicTitle];
      if (topicData) {
        setCompletion({
          totalModules: topicData.totalModules || topics.length,
          completedModules: topicData.completedModules || []
        });
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically (for same-tab updates)
    const interval = setInterval(handleStorageChange, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [topicTitle, topics.length]);

  const handleModuleClick = async (topic) => {
    const cacheKey = topic.id;
    
    // If already loaded, show detail view
    if (detailsCache[cacheKey]) {
      setViewMode('detail');
      setSelectedTopicId(cacheKey);
      return;
    }

    // Show loading
    setLoadingTopics(prev => new Set(prev).add(cacheKey));

    try {
      const token = localStorage.getItem('token');
      
      // First check if we have saved details
      const savedResponse = await fetch(
        `http://localhost:5000/get_notes?topic=${encodeURIComponent(topic.title)}&note_type=details`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      let details = null;
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.notes && savedData.notes.length > 0) {
          // Handle both array and object content
          const content = savedData.notes[0].content;
          details = Array.isArray(content) ? content : (content.details || content);
        }
      }
      
      // If no saved details, generate new ones
      if (!details) {
        const response = await fetch('http://localhost:5000/generate_details', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: topic.title }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 503) {
            throw new Error("AI is offline. Please start the LLM server on port 8080 and try again.");
          } else {
            throw new Error(errorData.error || "Failed to generate details");
          }
        }
        const data = await response.json();
        details = data.details;
      }
      
      // Cache the details
      setDetailsCache(prev => ({ ...prev, [cacheKey]: details }));
      setSelectedTopicId(cacheKey);
      setViewMode('detail');
    } catch (err) {
      alert(`Failed to load details: ${err.message}`);
    } finally {
      setLoadingTopics(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const selectedDetails = selectedTopic ? detailsCache[selectedTopicId] : null;

  // Calculate completion percentage
  const completionPercent = completion.totalModules > 0 
    ? Math.round((completion.completedModules.length / completion.totalModules) * 100)
    : 0;

  if (viewMode === 'detail' && selectedDetails) {
    return (
      <DetailView
        topicTitle={selectedTopic?.title || ''}
        details={selectedDetails}
        onBack={handleBackToList}
        mainTopic={topicTitle}
      />
    );
  }

  // List View
  return (
    <div className="roadmap-display roadmap-list-view">
      <div className="header-active-roadmap">
        <h2 className="roadmap-title">YOUR ROADMAP IS READY...</h2>
        <button className="new-search-button" onClick={onNewSearch}>
          New Search
        </button>
      </div>
      
      <div className="module-list-container">
        {topics.map((topic) => (
          <div key={topic.id} className="module-row">
            <button
              className="module-button"
              onClick={() => handleModuleClick(topic)}
              disabled={loadingTopics.has(topic.id)}
            >
              <span>{topic.title}</span>
              <span className={`expand-icon ${loadingTopics.has(topic.id) ? 'loading-animation' : ''}`}>
                {!loadingTopics.has(topic.id) && '→'}
              </span>
            </button>
            
            <button
              onClick={() => navigate(`/quiz?topic=${encodeURIComponent(topic.title)}&mainTopic=${encodeURIComponent(topicTitle)}`)}
              className="module-quiz-button"
            >
              quiz
            </button>
          </div>
        ))}
      </div>
      
      <div className="roadmap-footer">
        <div className="completion-bar">
          Roadmap completion: {completionPercent}%
        </div>
        <button
          onClick={() => navigate(`/quiz?topic=${encodeURIComponent(topicTitle)}&mainTopic=${encodeURIComponent(topicTitle)}`)}
          className="footer-button quiz-link"
        >
          Roadmap quiz
        </button>
      </div>
    </div>
  );
}

export default InteractiveRoadmap;
