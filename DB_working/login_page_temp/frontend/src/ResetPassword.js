import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resetPassword } from "./api/authReset";
import "./Login.css";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

function ResetPassword() {
  const query = useQuery();
  const token = query.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Missing or invalid token.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      setSubmitting(true);
      await resetPassword({ token, newPassword: password });
      setSuccess("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg">
      <div className="animated-bg"></div>
      <div className="login-container glass">
        <h1 className="neon-title">Reset Password</h1>
        <p className="subtitle">Enter a new password for your account</p>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <input
              type="password"
              className="input"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <input
              type="password"
              className="input"
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <div className="hint visible">{error}</div>}
          {success && <div className="hint visible" style={{ color: '#21ffce' }}>{success}</div>}
          <button className="login-btn neon-btn" type="submit" disabled={submitting}>
            <span>{submitting ? "Please wait..." : "Reset Password"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;


