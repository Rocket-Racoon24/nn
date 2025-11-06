// src/InteractiveRoadmap.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useTextSelection from './components/TextSelection'; // Assuming path is correct
import './styles/Roadmap.css';

// ====================================================================
// StudyItemDetail (NOW A "DUMB" COMPONENT)
// It no longer fetches data. It just renders props.
// ====================================================================
function StudyItemDetail({ term, subDetails, isLoading, error, context }) {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log("🔁 StudyItemDetail render:", renderCount.current, {
    term,
    isLoading,
    error,
  });

  // Callback for text selection (no change here)
  const handleAskXiao = useCallback((selectedText) => {
    window.dispatchEvent(new CustomEvent('askXiao', { detail: selectedText }));
  }, []);

  const containerRef = useTextSelection(handleAskXiao);

  // This simple "no term" placeholder is all that's needed now
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
        ref={containerRef} // Ref is attached here
        className="study-item-detail-display" 
      >
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
        
        {/* Handles the case where a term is selected but has no details/is not loading */}
        {!isLoading && !error && !subDetails && (
          <p className="placeholder-text">Loading...</p>
        )}
      </div>
    </div>
  );
}

// ====================================================================
// StudyItem (List Item Component)
// --- MODIFIED: Added 'hasNotification' prop to show a '!'
// ====================================================================
function StudyItem({ item, isActive, onClick, hasNotification }) {
  return (
    <div 
      className={`study-item ${isActive ? 'active' : ''}`}
      data-term={item.term}
      onClick={onClick}
    >
      <div className="study-item-header">
        <p>
          {/* Dot is moved from here */}
          <strong>{item.term}:</strong> {item.definition}
        </p>
        {/* To here, as a sibling of <p> */}
        {hasNotification && <span className="notification-dot">!</span>}
      </div>
    </div>
  );
}

// ====================================================================
// DetailView Component (Master View)
// --- MODIFIED: Now manages all fetching and state
// ====================================================================
function DetailView({ topicTitle, details, onBack, mainTopic }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [allStudyItems, setAllStudyItems] = useState([]);

  // --- NEW STATE: Lifted from StudyItemDetail ---
  const [subDetailCache, setSubDetailCache] = useState({});
  const [currentSubDetails, setCurrentSubDetails] = useState(null);
  const [isSubDetailLoading, setIsSubDetailLoading] = useState(false);
  const [subDetailError, setSubDetailError] = useState('');
  
  // --- NEW STATE: For notifications ---
  const [newlyLoadedTerms, setNewlyLoadedTerms] = useState(new Set());
  
  // Ref to track the current selected term inside async fetches
  const selectedTermRef = useRef(null);
  selectedTermRef.current = selectedTerm;

  // Effect to parse the list of items from props
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
      
      // Auto-select first item
      if (items.length > 0) {
        const currentSelectionValid = items.some(item => item.term === selectedTerm);
        if (!selectedTerm || !currentSelectionValid) {
           handleItemClick(items[0].term); // Use handleItemClick to trigger fetch
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]); // removed selectedTerm, handleItemClick to prevent re-loops

  // --- NEW: Async fetch function (moved from StudyItemDetail) ---
  const fetchSubDetails = async (termToFetch, context) => {
    try {
      const token = localStorage.getItem('token');
      
      // 1. Check for saved notes (from DB, not local cache)
      const savedResponse = await fetch(
        `http://localhost:5000/get_notes?topic=${encodeURIComponent(context)}&note_type=sub_details`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        const savedNote = savedData.notes.find(
          note => note.metadata && note.metadata.term === termToFetch
        );
        if (savedNote) {
          return savedNote.content; // Return the HTML content
        }
      }
      
      // 2. If not saved, generate new one
      const response = await fetch('http://localhost:5000/generate_sub_details', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ term: termToFetch, context }),
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
      
      // 3. Clean and return HTML content
      let htmlContent = data.sub_details.trim();
      if (htmlContent.startsWith("```html")) htmlContent = htmlContent.slice(7);
      if (htmlContent.endsWith("```")) htmlContent = htmlContent.slice(0, -3);
      htmlContent = htmlContent.trim();
      
      const encodedTerm = encodeURIComponent(termToFetch);
      const encodedContext = encodeURIComponent(context);
      const wikiLink = `https://en.wikipedia.org/w/index.php?search=${encodedTerm}+${encodedContext}`;
      
      const furtherReadingHTML = `
        <hr style="margin-top: 25px; border: 0; border-top: 1px solid rgba(0, 255, 156, 0.2);">
        <h3>Further Reading</h3>
        <p>
          <a href="${wikiLink}" target="_blank" rel="noopener noreferrer" style="color: #00ff9c; text-decoration: none;">
            &rarr; Search for "${termToFetch}" on Wikipedia
          </a>
        </p>
      `;
      
      return htmlContent + furtherReadingHTML;

    } catch (err) {
      // Re-throw the error to be caught by the caller
      throw err;
    }
  };

  // --- NEW: Click handler now manages state and triggers fetch ---
  const handleItemClick = useCallback((term) => {
    setSelectedTerm(term);
    setSubDetailError(''); // Clear previous errors

    // Clear notification for this term
    setNewlyLoadedTerms(prev => {
      if (prev.has(term)) {
        const newSet = new Set(prev);
        newSet.delete(term);
        return newSet;
      }
      return prev; // No change
    });

    // Check cache
    if (subDetailCache[term]) {
      // Load from cache
      setCurrentSubDetails(subDetailCache[term]);
      setIsSubDetailLoading(false);
    } else {
      // Not in cache, show loading and fetch
      setIsSubDetailLoading(true);
      setCurrentSubDetails(null); // Clear old content
      
      fetchSubDetails(term, mainTopic)
        .then(htmlContent => {
          // Add to cache
          setSubDetailCache(prevCache => ({ ...prevCache, [term]: htmlContent }));

          // --- THIS SOLVES THE RACE CONDITION ---
          // Only update UI if the user is still looking at this term
          if (selectedTermRef.current === term) {
            setCurrentSubDetails(htmlContent);
            setIsSubDetailLoading(false);
          } else {
            // User has clicked away. Don't update UI, but add notification
            setNewlyLoadedTerms(prev => new Set(prev).add(term));
          }
        })
        .catch(err => {
          // Also check if user is still on this term before showing error
          if (selectedTermRef.current === term) {
            setSubDetailError(err.message);
            setIsSubDetailLoading(false);
          }
          // If user clicked away, just log it
          console.error(`Failed to fetch ${term}:`, err.message);
        });
    }
  }, [mainTopic, subDetailCache]); // Dependencies

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
                  // NEW: Pass notification status
                  hasNotification={newlyLoadedTerms.has(item.term)}
                />
              ))}
            </div>
          ))}
        </div>
        
        {/* MODIFIED: Pass all state down as props */}
        <StudyItemDetail 
          term={selectedTerm} 
          context={mainTopic}
          subDetails={currentSubDetails}
          isLoading={isSubDetailLoading}
          error={subDetailError}
        />
      </div>
    </div>
  );
}

// ====================================================================
// Main InteractiveRoadmap Component (No significant changes needed)
// ====================================================================
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
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
        const completionData = JSON.parse(localStorage.getItem('roadmapCompletion')) || {};
        const topicData = completionData[topicTitle];
        if (topicData) {
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

  useEffect(() => {
    setViewMode('list');
    setSelectedTopicId(null);
  }, [topicTitle]);

  const handleModuleClick = async (topic) => {
    const cacheKey = topic.id;
    
    if (detailsCache[cacheKey]) {
      setViewMode('detail');
      setSelectedTopicId(cacheKey);
      return;
    }

    setLoadingTopics(prev => new Set(prev).add(cacheKey));

    try {
      const token = localStorage.getItem('token');
      
      const savedResponse = await fetch(
        `http://localhost:5000/get_notes?topic=${encodeURIComponent(topic.title)}&note_type=details`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      let details = null;
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.notes && savedData.notes.length > 0) {
          const content = savedData.notes[0].content;
          details = Array.isArray(content) ? content : (content.details || content);
        }
      }
      
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
    setSelectedTopicId(null);
  };

  const selectedTopic = topics.find(t => t.id === selectedTopicId);
  const selectedDetails = selectedTopic ? detailsCache[selectedTopicId] : null;

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