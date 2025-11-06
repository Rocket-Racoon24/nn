// src/InteractiveRoadmap.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useTextSelection from './components/TextSelection'; // Assuming path is correct
import './styles/Roadmap.css';

// Component for displaying sub-details when a study item is clicked
function StudyItemDetail({ term, context, onBack }) {
  const [subDetails, setSubDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const renderCount = useRef(0);
  renderCount.current++;
  console.log("🔁 StudyItemDetail render:", renderCount.current, {
    term,
    isLoading,
    error,
    subDetails,
  });

  useEffect(() => {
    console.log("Re-render: StudyItemDetail");
  });

  // Callback for text selection
  const handleAskXiao = useCallback((selectedText) => {
    // This event dispatch is a great way to communicate with a global listener
    window.dispatchEvent(new CustomEvent('askXiao', { detail: selectedText }));
  }, []); // empty dependency → stable reference

  // UPDATED: The hook now ONLY returns the ref.
  // The button is managed internally by the hook.
  const containerRef = useTextSelection(handleAskXiao);

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
      <div className="detail-view-right-panel">
        <div className="study-item-detail-display">
          <p className="placeholder-text">Select a topic from the left to view details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-view-right-panel">
      <div 
        ref={containerRef} // Ref is attached here, as before
        className="study-item-detail-display" 
        // This div needs `position: relative` from CSS (which it has)
      >
        {/* UPDATED: We no longer render {AskButton} here. */}
        {/* The hook injects the button into this div's DOM node. */}
        
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
        {!isLoading && !error && subDetails && <div dangerouslySetInnerHTML={{ __html: subDetails }} />}
        {!isLoading && !error && !subDetails && (
          <p className="placeholder-text">Select a topic from the left to view details.</p>
        )}
      </div>
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
      // Logic to auto-select first item
      if (items.length > 0) {
        // Only auto-select if selectedTerm is currently null
        // or if the previously selected term is no longer in the list
        // (e.g. new details loaded)
        // This check prevents re-setting selection if user already clicked
        const currentSelectionValid = items.some(item => item.term === selectedTerm);
        if (!selectedTerm || !currentSelectionValid) {
           setSelectedTerm(items[0].term);
        }
      }
    }
  }, [details, selectedTerm]); // Keep selectedTerm dependency

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
        
        <StudyItemDetail 
          term={selectedTerm} 
          context={mainTopic}
        />
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
    const handleStorageChange = (e) => {
      // Only update if the key is 'roadmapCompletion'
      if (e.key === 'roadmapCompletion') {
        const completionData = JSON.parse(e.newValue) || {};
        const topicData = completionData[topicTitle];
        if (topicData) {
          setCompletion({
            totalModules: topicData.totalModules || topics.length,
            completedModules: topicData.completedModules || []
          });
        }
      }
    };
    
    // Listen for cross-tab storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // This interval is good for same-tab, but let's make it
    // less frequent and also use the 'storage' event which is better.
    // We'll keep the interval as a fallback for same-tab updates
    // that don't fire 'storage' event.
    const interval = setInterval(() => {
        const completionData = JSON.parse(localStorage.getItem('roadmapCompletion')) || {};
        const topicData = completionData[topicTitle];
        if (topicData) {
          // Check if completion is different before setting state
          setCompletion(prevCompletion => {
            const newCompleted = topicData.completedModules || [];
            if (prevCompletion.completedModules.length !== newCompleted.length) {
              return {
                totalModules: topicData.totalModules || topics.length,
                completedModules: newCompleted
              };
            }
            return prevCompletion;
          });
        }
    }, 2000); // Check every 2 seconds
    
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
    setSelectedTopicId(null); // Clear selected topic
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
        {/* FIX 1: Changed className.completion-bar" to className="completion-bar" */}
        <div className="completion-bar">
          Roadmap completion: {completionPercent}%
        </div>
        <button
          // FIX 2: Changed TtopicTitle to topicTitle
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