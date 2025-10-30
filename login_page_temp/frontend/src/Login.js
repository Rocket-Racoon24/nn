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
      <div className="animated-bg">
        <div className="circuit-node node1"></div>
        <div className="circuit-node node2"></div>
        <div className="circuit-node node3"></div>
        <div className="circuit-node node4"></div>
        <div className="circuit-node node5"></div>
        <div className="circuit-node node6"></div>
        <div className="circuit-node node7"></div>
        <div className="circuit-node node8"></div>
        <div className="circuit-node node9"></div>
        <div className="circuit-node node10"></div>
        <div className="circuit-node node11"></div>
        <div className="circuit-node node12"></div>
        <div className="circuit-node node13"></div>
        <div className="circuit-node node14"></div>
        <div className="circuit-node node15"></div>
        <div className="circuit-node node16"></div>
        <div className="circuit-node node17"></div>
        <div className="circuit-node node18"></div>
        <div className="circuit-node node19"></div>
        <div className="circuit-node node20"></div>
        <div className="circuit-node node21"></div>
        <div className="circuit-node node22"></div>
        <div className="circuit-node node23"></div>
        <div className="circuit-node node24"></div>
        <div className="circuit-node node25"></div>
        <div className="circuit-node node26"></div>
        <div className="circuit-node node27"></div>
        <div className="circuit-node node28"></div>
        <div className="circuit-node node29"></div>
        <div className="circuit-node node30"></div>
        <div className="circuit-node node31"></div>
        <div className="circuit-node node32"></div>
      </div>

      <div className={`login-container glass${!isLogin ? " signup-compact" : ""}`}>
        <h1 className="neon-title shine">NEONMIND</h1>
        <h2 className="welcome">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="subtitle">
          {isLogin ? "Login to continue your journey" : "Sign up and join the NEONMIND experience"}
        </p>

        <form className="form" onSubmit={handleLogin}>
          {isAwaitingOtp ? (
            <>
              <div className="field">
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
              <button type="button" className="login-btn neon-btn" onClick={handleVerifyOtp}>
                <span>Verify OTP</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: 6 }}>
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
            <input
              type="text"
              placeholder="Full Name"
              className={`input${focusField === "name" ? " focus" : ""}`}
              onFocus={() => setFocusField("name")}
              onBlur={() => setFocusField(null)}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <div className="field">
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

          <div className="field">
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
            <div className="field">
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

          <button className="login-btn neon-btn" type="submit" disabled={!isLogin && (emailError || passwordError)}>
            <span>{isLogin ? "Login" : "Sign Up"}</span>
          </button>
          {isLogin && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span className="signup-link" onClick={handleForgotPassword}>Forgot password?</span>
            </div>
          )}
            </>
          )}
        </form>

        <div className="signup">
          {isLogin ? "Don't have an account?" : "Already have an account?"} <span className="signup-link pulse" onClick={() => { setIsLogin(!isLogin); setEmailError(""); setPasswordError(""); }}>{isLogin ? "Sign Up" : "Login"}</span>
        </div>
      </div>
    </div>
  );
};

export default Login;