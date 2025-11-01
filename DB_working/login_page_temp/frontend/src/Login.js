/* **IMPORTANT:** For the new icons to work, add this line 
  to the <head> section of your public/index.html file:

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" />
*/

import "./Login.css";
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from "react";
import { registerUser, verifyOtp, resendOtp } from "./api/authRegister";
import { requestPasswordReset } from "./api/authForgot";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [focusField, setFocusField] = useState(null);
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/home');
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);

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

    // basic live validation for both login and signup
    const emailParts = inputEmail.split("@");
    if (inputEmail === '') {
      setEmailError("");
    } else if (emailParts.length === 1) {
      setEmailError("Please include '@' in your email address.");
    } else if (emailParts.length === 2) {
      const domain = emailParts[1].toLowerCase();
      if (!validDomains.includes(domain)) {
        setEmailError("Use a valid email like Gmail, Outlook, or ProtonMail.");
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("Invalid email format.");
    }
  };

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
      const res = await fetch(`http://127.0.0.1:5000/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/home", { replace: true });
      } else {
        if (res.status === 403 && (data.message || "").toLowerCase().includes("verify")) {
          alert(data.message);
          // Route user straight to OTP verification flow using their login email
          setRegisterEmail(email);
          setIsAwaitingOtp(true);
          setIsLogin(false);
        } else {
          alert(data.message);
        }
      }
    } else {
      try {
        await registerUser({ username, email, password });
        setRegisterEmail(email);
        setIsAwaitingOtp(true);
        alert("✅ Registered. Check your email for the OTP.");
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !registerEmail) return;
    try {
      await verifyOtp({ email: registerEmail, otp });
      alert("✅ Email verified! You can now log in.");
      setIsAwaitingOtp(false);
      setIsLogin(true);
      setOtp("");
    } catch (err) {
      console.error("verify-otp error:", err);
      alert(err.message || "Failed to verify OTP");
    }
  };

  const handleResendOtp = async () => {
    if (!registerEmail) return;
    if (resendCooldown > 0) return;
    try {
      await resendOtp({ email: registerEmail });
      alert("📧 OTP resent to your email.");
      setResendCooldown(60);
    } catch (err) {
      console.error("resend-otp error:", err);
      alert(err.message || "Failed to resend OTP");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Enter your email above to receive a reset link.");
      return;
    }
    try {
      await requestPasswordReset({ email });
      alert("📬 Password reset email sent. Check your inbox.");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="bg">
      {/* The animated-bg div is now hidden by CSS, but no harm leaving it */}
      <div className="animated-bg"></div>

      <div className={`login-container glass${!isLogin ? " signup-compact" : ""}`}>
        <h1 className="neon-title">NEONMIND</h1>
        <p className="subtitle">
          {isLogin ? "Login to continue your journey" : "Sign up and join the NEONMIND experience"}
        </p>

        <form className="form" onSubmit={handleLogin}>
          {isAwaitingOtp ? (
            <>
              {/* Using input-group for OTP field as well */}
              <div className="input-group">
                <i className="input-icon fas fa-key"></i>
                <input
                  type="text"
                  placeholder="Enter OTP sent to your email"
                  className={`input${focusField === "otp" ? " focus" : ""}`}
                  onFocus={() => setFocusField("otp")}
                  onBlur={() => setFocusField(null)}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <button type="button" className="login-btn" onClick={handleVerifyOtp}>
                <span>Verify OTP</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: 15, marginBottom: 15 }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCooldown > 0 ? '#7d8596' : '#21ffce',
                    textDecoration: 'underline',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
                // Full Name Input
                <div className="input-group">
                  <i className="input-icon fas fa-user"></i>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className={`input${focusField === "name" ? " focus" : ""}`}
                    onFocus={() => setFocusField("name")}
                    onBlur={() => setFocusField(null)}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  {/* Assuming no hint needed for name, but you could add one */}
                  <div className="hint"></div> 
                </div>
              )}

              {/* Email Input */}
              <div className="input-group">
                <i className="input-icon fas fa-envelope"></i>
                <input
                  type="email"
                  placeholder="Email Address"
                  className={`input${focusField === "email" ? " focus" : ""}`}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  value={email}
                  onChange={handleEmailChange}
                  required
                />
                <div className={`hint${emailError ? " visible" : ""}`}>{emailError || ""}</div>
              </div>

              {/* Password Input */}
              <div className="input-group">
                <i className="input-icon fas fa-lock"></i>
                <input
                  type="password"
                  placeholder="Password"
                  className={`input${focusField === "password" ? " focus" : ""}`}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField(null)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPassword(value);
                    if (!isLogin && confirmPassword && value !== confirmPassword) {
                      setPasswordError("Passwords do not match.");
                    } else {
                      setPasswordError("");
                    }
                  }}
                  required
                />
                <div className={`hint${!isLogin && passwordError ? " visible" : ""}`}>{!isLogin && passwordError ? passwordError : ""}</div>
              </div>

              {!isLogin && (
                // Confirm Password Input
                <div className="input-group">
                  <i className="input-icon fas fa-lock"></i>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    className={`input${focusField === "confirm" ? " focus" : ""}`}
                    onFocus={() => setFocusField("confirm")}
                    onBlur={() => setFocusField(null)}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                  <div className={`hint${passwordError ? " visible" : ""}`}>{passwordError || ""}</div>
                </div>
              )}

              {/* NEW: Options Row (Remember/Forgot) */}
              {isLogin && (
                <div className="options-row">
                  <label className="remember-me">
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <span className="forgot-password" onClick={handleForgotPassword}>
                    Forgot password?
                  </span>
                </div>
              )}

              <button className="login-btn" type="submit" disabled={!isLogin && (emailError || passwordError)}>
                <span>{isLogin ? "Login" : "Sign Up"}</span>
              </button>
              
              {/* OLD Forgot Password removed - it's now in the options-row */}
            </>
          )}
        </form>

        <div className="signup">
          {isLogin ? "Don't have an account?" : "Already have an account?"} <span className="signup-link" onClick={() => { setIsLogin(!isLogin); setEmailError(""); setPasswordError(""); }}>{isLogin ? "Sign Up" : "Login"}</span>
        </div>
      </div>
    </div>
  );
};

export default Login;