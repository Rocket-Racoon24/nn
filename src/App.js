import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your components
import Home from './Home';
import About from './About';
import Contact from './Contact';
import Login from './Login';

const App = () => {
  return (
    <>
    
      <Router>
        <div>
          <nav>
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </nav>
          
          <Login/>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            

          </Routes>
        </div>
      </Router>
    </>
  );
};

export default App;
