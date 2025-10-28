import React, { useState } from "react";
import "./login.css";

function Login() {
  const [focusField, setFocusField] = useState(null);

  return (
    <div className="bg">
      <div className="animated-bg">
        {/* Extra animated circuit nodes */}
        <div className="circuit-node node1"></div>
        <div className="circuit-node node2"></div>
        <div className="circuit-node node3"></div>
        <div className="circuit-node node4"></div>
      </div>
      <div className="login-container glass">
        <h1 className="neon-title shine">NEONMIND</h1>
        <h2 className="welcome">Welcome Back</h2>
        <p className="subtitle">Login to continue your journey</p>
        <form>
          <input
            type="email"
            placeholder="Email Address"
            className={`input${focusField === "email" ? " focus" : ""}`}
            onFocus={() => setFocusField("email")}
            onBlur={() => setFocusField(null)}
          />
          <input
            type="password"
            placeholder="Password"
            className={`input${focusField === "password" ? " focus" : ""}`}
            onFocus={() => setFocusField("password")}
            onBlur={() => setFocusField(null)}
          />
          <button className="login-btn neon-btn" type="submit">
            <span>Login</span>
          </button>
        </form>
        <div className="signup">
          Don't have an account? <span className="signup-link pulse">Sign Up</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
