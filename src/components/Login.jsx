import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIntroLoading, setIsIntroLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          setIsIntroLoading(false);
        });
      } else {
        setIsIntroLoading(false);
      }
    }, 1800); // 1.8 seconds loading experience
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Retrieve credentials from environment variables with fallback values
    const expectedUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
    const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'pluto2026';

    // Simulate a slight delay for premium feedback animation
    setTimeout(() => {
      if (username.trim() === expectedUsername && password === expectedPassword) {
        onLogin(username.trim(), rememberMe);
      } else {
        setError('Invalid administrator username or password.');
        setIsLoading(false);
      }
    }, 800);
  };

  if (isIntroLoading) {
    return (
      <div className="login-intro-container">
        <div className="login-intro-planet-wrapper" style={{ viewTransitionName: 'login-planet' }}>
          <svg viewBox="0 0 32 32" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg" className="login-intro-planet-svg">
            <defs>
              <radialGradient id="introPlutoPlanetGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffeedd" />
                <stop offset="60%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#7c2d12" />
              </radialGradient>
            </defs>
            <circle cx="16" cy="16" r="12" fill="url(#introPlutoPlanetGrad)" />
            <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)">
              <path 
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                fill="#ffffff" 
                opacity="0.9"
              />
            </g>
            <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-glass-card">
        
        {/* Logo Section */}
        <div className="login-logo-section">
          <div className="login-logo-icon" style={{ viewTransitionName: 'login-planet' }}>
            <svg viewBox="0 0 32 32" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="loginPlutoPlanetGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffeedd" />
                  <stop offset="60%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="#7c2d12" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#loginPlutoPlanetGrad)" />
              <g transform="translate(13, 12.5) scale(0.35) rotate(-20 12 12)">
                <path 
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                  fill="#ffffff" 
                  opacity="0.9"
                />
              </g>
              <circle cx="16" cy="16" r="12" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.5" />
            </svg>
          </div>
          <h1 className="login-title">Welcome to Pluto</h1>
          <p className="login-subtitle">Sheets Sales CRM & Deals Campaign Manager</p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="login-form">
          
          {/* Username Input Group */}
          <div className="login-input-group">
            <div className="login-input-wrapper">
              <User size={18} className="login-field-icon" />
              <input
                id="username-field"
                type="text"
                className={`login-input ${username ? 'has-content' : ''}`}
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
              <label htmlFor="username-field" className="login-input-label">Username</label>
            </div>
          </div>

          {/* Password Input Group */}
          <div className="login-input-group">
            <div className="login-input-wrapper">
              <Lock size={18} className="login-field-icon" />
              <input
                id="password-field"
                type={showPassword ? 'text' : 'password'}
                className={`login-input ${password ? 'has-content' : ''}`}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <label htmlFor="password-field" className="login-input-label">Password</label>
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="login-remember-row">
            <label className="login-remember-label">
              <input
                type="checkbox"
                className="login-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="login-checkbox-custom"></span>
              Keep me logged in
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loader-spinner-small"></div>
            ) : (
              <>
                <span>Access Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Warning Footer */}
        <div className="login-footer">
          Gated by environment credentials. Secured client-side session.
        </div>

      </div>
    </div>
  );
}
