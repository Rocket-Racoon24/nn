import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username,setUsername] = useState('')
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const handleLogin = (e) => {
    e.preventDefault();
    console.log(email,password)
    
    // In a real-world application, you'd authenticate here, like checking the username/password with a server.
    if (email === 'a@b' && password === '123') {
      // If login is successful, navigate to the Home page
      navigate('/home');
    } else {
      alert('Invalid credentials!');
    }
  };


  return (
    <div className="app-container">
      {/* Brand Outside the Card */}
      <h1 className="brand">NEONMIND</h1>

      {/* Auth Card */}
      <div className="card">
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="subtitle">
          {isLogin
            ? "Login to continue your journey"
            : "Sign up and join the NEONMIND experience"}
        </p>

        <form className="form" onSubmit={handleLogin}>
          {!isLogin && (
            <input type="text" placeholder="Full Name" className="input" 
            onChange={(e) => setUsername(e.target.value)} 
            required />
          )}
          <input type="email" placeholder="Email Address" className="input" 
             onChange={(e) => setEmail(e.target.value)} 
             required />
          <input type="password" placeholder="Password" className="input" 
             onChange={(e) => setPassword(e.target.value) } 
             required/>

          {!isLogin && (
            <input
              type="password"
              placeholder="Confirm Password"
              className="input"
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required
            />
          )}

          <button type="submit" className="btn">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;