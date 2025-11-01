import React from "react";
import { useNavigate } from "react-router-dom"; // Your navigation hook
import "./main.css"; // The new stylesheet

function Main() {
  const navigate = useNavigate(); // Your hook from react-router-dom

  // This is your original function, it's unchanged and will work
  const handleGetStarted = () => {
    navigate("/Login");
  };

  // Smooth scroll function for navigation
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Navigation handlers
  const handleNavClick = (section) => {
    switch(section) {
      case 'Home':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'Features':
        scrollToSection('features');
        break;
      case 'About':
        scrollToSection('about');
        break;
      case 'Contact':
        scrollToSection('contact');
        break;
      default:
        break;
    }
  };

  return (
    <div className="main-container">
      {/* --- Navbar --- */}
      <nav className="navbar">
        <h1 className="logo" onClick={() => handleNavClick('Home')}>Neon Mind</h1>
        <ul className="nav-links">
          {/* <li onClick={() => handleNavClick('Home')}>Home</li>  Home button is removed from the navbar */}
          <li onClick={() => handleNavClick('Features')}>Features</li>
          <li onClick={() => handleNavClick('About')}>About</li>
          <li onClick={() => handleNavClick('Contact')}>Contact</li>
        </ul>
      </nav>

      {/* --- Hero Section --- */}
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

      {/* --- Features Section (Your Original) --- */}
      <section id="features" className="features-section">
        <h3 className="section-title">Your Complete Study Toolkit</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon">
              {/* Smart Learning Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494M15.5 9.752l-6.5 4.496M8.5 9.752l6.5 4.496M12 21.75c-5.385 0-9.75-4.365-9.75-9.75S6.615 2.25 12 2.25c5.385 0 9.75 4.365 9.75 9.75S17.385 21.75 12 21.75z" />
              </svg>
            </div>
            <h3>⚡ Smart Learning</h3>
            <p>Organize your notes and goals in one place.</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">
              {/* Focus Mode Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>🎯 Focus Mode</h3>
            <p>Stay distraction-free with custom timers.</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">
              {/* Progress Tracker Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3>📊 Progress Tracker</h3>
            <p>Track your growth with clean analytics.</p>
          </div>
        </div>
      </section>

      {/* --- How It Works Section (New) --- */}
      <section id="about" className="how-it-works-section">
        <h3 className="section-title">About Neon Mind</h3>
        <div className="how-it-works-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h4>Create Your Account</h4>
            <p>Sign up and create your personalized study hub.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h4>Add Your Subjects</h4>
            <p>Organize notes, set goals, and schedule your time.</p>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h4>Start Studying</h4>
            <p>Use the focus timer and watch your progress grow.</p>
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section id="contact" className="testimonials-section">
        <h3 className="section-title">Get In Touch</h3>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <h4>📧 Email Us</h4>
            <p>Have questions or feedback? We'd love to hear from you!</p>
            <span>contact@neonmind.com</span>
          </div>
          <div className="testimonial-card">
            <h4>💬 Support</h4>
            <p>Need help getting started? Our support team is here to help.</p>
            <span>Available 24/7</span>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Neon Mind | All rights reserved</p>
      </footer>
    </div>
  );
}

export default Main;
