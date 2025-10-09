import React from "react";
import { useNavigate } from "react-router-dom";
import "./main.css";

function Main() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/Login");
  };

  // <-- CHANGE: Add a function to handle smooth scrolling
  const handleScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="main">
      {/* Navbar */}
      <nav className="navbar">
        <h1 className="logo">Neon Mind</h1>
        <ul className="nav-links">
          {/* <-- CHANGE: Make list items clickable */}
          <li onClick={() => handleScroll("features")}>Features</li>
          <li onClick={() => handleScroll("about")}>About</li>
          <li onClick={() => handleScroll("contact")}>Contact</li>
        </ul>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <h2>
          Welcome to <span className="highlight">Neon Mind</span>
        </h2>
        <p>
          Boost your productivity, track your learning, and keep your mind
          glowing. ✨
        </p>
        <button className="cta" onClick={handleGetStarted}>
          Get Started
        </button>
      </header>

      {/* <-- CHANGE: Add an id to the features section */}
      <section id="features" className="features">
        <div className="feature-card">
          <h3>⚡ Smart Learning</h3>
          <p>Organize your notes and goals in one place.</p>
        </div>
        <div className="feature-card">
          <h3>🎯 Focus Mode</h3>
          <p>Stay distraction-free with custom timers.</p>
        </div>
        <div className="feature-card">
          <h3>📊 Progress Tracker</h3>
          <p>Track your growth with clean analytics.</p>
        </div>
      </section>

      {/* <-- CHANGE: Add a new "About" section */}
      <section id="about" className="about-section">
        <h2>About Us</h2>
        <p>
          Neon Mind is a modern study application designed to help students and
          learners organize their knowledge, stay focused, and achieve their
          goals with powerful AI-driven tools.
        </p>
      </section>

      {/* <-- CHANGE: Add an id to the footer to act as the contact section */}
      <footer id="contact" className="footer">
        <p>
          Questions or feedback? Email us at{" "}
          <a href="mailto:support@neonmind.app">support@neonmind.app</a>
        </p>
        <p>© {new Date().getFullYear()} Neon Mind | All rights reserved</p>
      </footer>
    </div>
  );
}

export default Main;