import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  // ✅ Email validation
  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);

    if (!isLogin) {
      const validDomains = [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "icloud.com",
        "protonmail.com",
        "zoho.com",
        "aol.com",
        "mail.com"
      ];

      const emailParts = inputEmail.split("@");
      if (emailParts.length === 1) {
        setEmailError("Please include '@' in your email address.");
      } else if (emailParts.length === 2) {
        const domain = emailParts[1].toLowerCase();
        if (!validDomains.includes(domain)) {
          setEmailError("Use a valid email like Gmail, Outlook, or ProtonMail.");
        } else {
          setEmailError("");
        }
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  };

  // ✅ Password match check
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (value && password && value !== password) {
      setPasswordError("Passwords do not match.");
    } else {
      setPasswordError("");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isLogin && (emailError || passwordError)) return;

    if (isLogin) {
      // 🔹 Login
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/home");
      } else {
        alert(data.message);
      }
    } else {
      // 🔹 Sign up
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        alert("✅ User registered successfully");
        setIsLogin(true);
      } else {
        alert(data.message);
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="brand">NEONMIND</h1>

      <div className="card">
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="subtitle">
          {isLogin
            ? "Login to continue your journey"
            : "Sign up and join the NEONMIND experience"}
        </p>

        <form className="form" onSubmit={handleLogin}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              className="input"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          {/* EMAIL INPUT */}
          <div className="input-container">
            <input
              type="email"
              placeholder="Email Address"
              className={`input ${emailError ? "input-error" : ""}`}
              value={email}
              onChange={handleEmailChange}
              required
            />
            {!isLogin && emailError && (
              <div className="hint-box">{emailError}</div>
            )}
          </div>

          {/* PASSWORD INPUT */}
          <input
            type="password"
            placeholder="Password"
            className="input"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* CONFIRM PASSWORD INPUT */}
          {!isLogin && (
            <div className="input-container">
              <input
                type="password"
                placeholder="Confirm Password"
                className={`input ${passwordError ? "input-error" : ""}`}
                onChange={handleConfirmPasswordChange}
                required
              />
              {passwordError && (
                <div className="hint-box">{passwordError}</div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn"
            disabled={!isLogin && (emailError || passwordError)}
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={() => { setIsLogin(!isLogin); setEmailError(""); setPasswordError(""); }}>
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
