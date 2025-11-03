import React, { useState, useEffect } from 'react';

function Settings({ onBack }) {
  const [status, setStatus] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed && parsed.email) setUserEmail(parsed.email);
    } catch (_) {}
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await fetch('http://localhost:5000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await res.json();
      if (res.ok) setStatus({ ok: true, msg: data.message || 'Reset email sent.' });
      else setStatus({ ok: false, msg: data.message || 'Failed to send reset email.' });
    } catch (e) {
      setStatus({ ok: false, msg: 'Network error.' });
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px', color: '#e5fff3', backgroundColor: '#0b1213' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#00ff9c', textShadow: '0 0 8px rgba(0,255,156,0.3)', margin: 0 }}>Settings</h2>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,255,156,0.4)', background: 'transparent', color: '#00ff9c', fontWeight: 'bold' }}>← Back to Home</button>
      </div>

      <div style={{ background: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, color: '#e5fff3' }}>Reset Password</h3>
        <form onSubmit={handleReset} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="email"
            readOnly
            value={userEmail || ''}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #23403a', background: '#0f1a1b', color: '#e5fff3' }}
          />
          <button type="submit" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,255,156,0.4)', background: 'transparent', color: '#00ff9c', fontWeight: 'bold' }}>
            Send Reset
          </button>
        </form>
        {status && (
          <p style={{ marginTop: '10px', color: status.ok ? '#00ff9c' : '#ff7575' }}>{status.msg}</p>
        )}
      </div>

      <div style={{ background: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#e5fff3' }}>Contact Support</h3>
        <p style={{ margin: 0, color: '#a9ffdf' }}>Email: <a href="mailto:neonmindapp@gmail.com" style={{ color: '#00ff9c', textDecoration: 'none' }}>neonmindapp@gmail.com</a></p>
      </div>
    </div>
  );
}

export default Settings;

