import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../firebase';

// Google's official brand colours
const GOOGLE_BLUE = '#4285F4';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  
  // Local auth fallback states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.startViewTransition) {
        document.startViewTransition(() => setIsIntroLoading(false));
      } else {
        setIsIntroLoading(false);
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle(rememberMe);
      const user = result.user;
      onLogin(user.displayName || user.email, rememberMe, user);
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your connection and retry.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const adminUser = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'pluto2026';

    if (username.trim() === adminUser && password === adminPass) {
      onLogin(username.trim(), rememberMe, null);
    } else {
      setError('Invalid username or password.');
      setIsLoading(false);
    }
  };

  /* ─── Intro loading planet animation (unchanged) ─────────────────────── */
  if (isIntroLoading) {
    return (
      <div className="login-intro-container">
        <div className="login-intro-planet-wrapper">
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
            <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    );
  }

  /* ─── Main login card (glassmorphism) ─────────────────────────────────── */
  return (
    <div className="login-page-container">
      <div className="login-glass-card">

        {/* Logo Section */}
        <div className="login-logo-section">
          <div className="login-logo-icon">
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
              <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            </svg>
          </div>
          <h1 className="login-title">Welcome to Pluto</h1>
          <p className="login-subtitle">Sheets Sales CRM &amp; Deals Campaign Manager</p>
        </div>

        {/* Firebase Config Guide Notice */}
        {!isConfigured && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
            padding: '0.75rem',
            marginBottom: '1rem',
            fontSize: 'var(--text-xs)',
            color: '#f59e0b',
            lineHeight: '1.45'
          }}>
            <strong>⚙️ Firebase Configuration Notice:</strong><br />
            To enable team sharing, Google Auth, and real-time syncing, fill in the environment keys in your <code>.env</code> file. The app is currently running in local-offline sandbox mode.
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {isConfigured ? (
          /* Google Sign-In Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: 'var(--text-body)',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.borderColor = GOOGLE_BLUE;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
              }}
            >
              {isLoading ? (
                <div className="loader-spinner-small" />
              ) : (
                <GoogleIcon />
              )}
              <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
              {!isLoading && <ArrowRight size={16} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </button>

            <label className="login-remember-label" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                className="login-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="login-checkbox-custom" />
              Keep me signed in
            </label>
          </div>
        ) : (
          /* Fallback Credentials Login Mode */
          <form onSubmit={handleCredentialsSubmit} className="login-form">
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

            <button
              type="submit"
              className="login-btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="loader-spinner-small" />
              ) : (
                <>
                  <span>Access Local Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="login-footer">
          {isConfigured 
            ? 'Secured via Google OAuth 2.0 · Your data stays in your Google Sheet'
            : 'Running offline sandbox · Gated by local VITE_ADMIN credentials'}
        </div>

      </div>
    </div>
  );
}
