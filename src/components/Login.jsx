import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../firebase';

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

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIntroLoading, setIsIntroLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuth();

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
      await signInWithGoogle(rememberMe);
    } catch (err) {
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName, rememberMe);
      } else if (mode === 'login') {
        await signInWithEmail(email, password, rememberMe);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
        setIsLoading(false);
        return;
      }
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
      };
      setError(messages[err.code] || 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="login-page-container">
        <div className="login-glass-card">
          <div className="login-logo-section">
            <h1 className="login-title">Firebase Required</h1>
            <p className="login-subtitle">
              Please configure Firebase in your <code>.env</code> file to use Pluto CRM.
            </p>
          </div>
          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
            padding: '0.75rem',
            fontSize: 'var(--text-xs)',
            color: '#f59e0b',
            lineHeight: '1.45'
          }}>
            Copy <code>.env.example</code> to <code>.env</code> and fill in your Firebase project keys:
            VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, etc.
          </div>
        </div>
      </div>
    );
  }

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
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" opacity="0.9" />
            </g>
            <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-glass-card">
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
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ffffff" opacity="0.9" />
              </g>
              <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            </svg>
          </div>
          <h1 className="login-title">
            {mode === 'reset' ? 'Reset Password' : 'Welcome to Pluto'}
          </h1>
          <p className="login-subtitle">
            {mode === 'reset' ? "Enter your email to receive a reset link" : 'Sheets Sales CRM & Deals Campaign Manager'}
          </p>
        </div>

        {error && (
          <div className="login-error-banner">
            <AlertCircle size={16} className="login-error-icon" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            marginBottom: '0.75rem',
            fontSize: 'var(--text-xs)',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>{success}</span>
          </div>
        )}

        {mode !== 'reset' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
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
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.borderColor = GOOGLE_BLUE; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            >
              {isLoading ? <div className="loader-spinner-small" /> : <GoogleIcon />}
              <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              <span>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="login-form">
          {mode === 'register' && (
            <div className="login-input-group">
              <div className="login-input-wrapper">
                <User size={18} className="login-field-icon" />
                <input
                  type="text"
                  className={`login-input ${displayName ? 'has-content' : ''}`}
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                />
                <label className="login-input-label">Full Name</label>
              </div>
            </div>
          )}

          <div className="login-input-group">
            <div className="login-input-wrapper">
              <Mail size={18} className="login-field-icon" />
              <input
                type="email"
                className={`login-input ${email ? 'has-content' : ''}`}
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
              />
              <label className="login-input-label">Email</label>
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="login-input-group">
              <div className="login-input-wrapper">
                <Lock size={18} className="login-field-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`login-input ${password ? 'has-content' : ''}`}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  disabled={isLoading}
                />
                <label className="login-input-label">Password</label>
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="login-remember-row" style={{ justifyContent: 'space-between' }}>
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  className="login-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="login-checkbox-custom"></span>
                Keep me signed in
              </label>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button type="submit" className="login-btn-submit" disabled={isLoading}>
            {isLoading ? (
              <div className="loader-spinner-small" />
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                </span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {mode === 'login' && (
            <span>
              Don't have an account?{' '}
              <button type="button" onClick={() => { setMode('register'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 600 }}>
                Sign up
              </button>
            </span>
          )}
          {mode === 'register' && (
            <span>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 600 }}>
                Sign in
              </button>
            </span>
          )}
          {mode === 'reset' && (
            <span>
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 600 }}>
                Back to sign in
              </button>
            </span>
          )}
        </div>

        <div className="login-footer">
          Secured via Firebase Auth
        </div>
      </div>
    </div>
  );
}
