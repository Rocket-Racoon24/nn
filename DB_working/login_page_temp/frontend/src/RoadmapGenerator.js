// RoadmapGenerator.js (Updated to be a Search Component)
import React, { useState } from 'react';
import './styles/Roadmap.css';

// This is the main component for the entire feature.
function RoadmapGenerator({ onRoadmapGenerated }) { // Receives a function as a prop
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/generate_roadmap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const data = await response.json();

      // --- KEY CHANGE: Instead of setting local state, call the function from Home.js ---
      onRoadmapGenerated({ topic: query, topics: data.topics });

      setQuery('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') { handleGenerate(); }
  };

  return (
    <div className="roadmap-app-container">
      <div className="initial-view">
        <h1 className="main-title">AI Roadmap Generator</h1>
        <p className="subtitle">Enter a topic below to generate a new learning plan.</p>
        <div className="search-box">
          <input type="text" placeholder="e.g., Quantum Computing" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={handleKeyPress} className="search-input" disabled={isLoading} />
          <button onClick={handleGenerate} disabled={isLoading || !query.trim()} className="generate-button">
            {isLoading ? 'Loading...' : 'Generate'}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
export default RoadmapGenerator;