import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './Home';
import Login from './Login';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Show Login page as the default route */}
        <Route path="/" element={<Login />} />
        {/* After login navigate to this route */}
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
};

export default App;
