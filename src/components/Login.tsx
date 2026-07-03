import React from 'react';
import { useMed } from '../context/MedContext';
import { Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useMed();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrapper">
          <div className="login-logo-mark">
            <span>M</span>
          </div>
          <h1 className="login-brand">Med<span className="login-accent">DNA</span></h1>
        </div>

        <p className="login-tagline">Your intelligent medical companion for prescription management, dose tracking, and pharmacy lookup.</p>

        <div className="login-features-row">
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>AI OCR Scanner</span>
          </div>
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>Dose Tracker</span>
          </div>
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>Smart Reminders</span>
          </div>
        </div>

        <button className="google-login-btn" onClick={login}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <p className="login-disclaimer">By signing in, you agree to our Terms of Service and Privacy Policy.</p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 1.5rem;
        }

        .login-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .login-logo-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }

        .login-logo-mark {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          background: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-logo-mark span {
          color: white;
          font-family: var(--font-display);
          font-weight: 900;
          font-size: 1.5rem;
        }

        .login-brand {
          font-size: 1.6rem;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .login-accent {
          color: var(--color-primary);
        }

        .login-tagline {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 300px;
        }

        .login-features-row {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .login-feature-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.3rem 0.6rem;
          background: var(--bg-input);
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .login-feature-chip svg {
          color: var(--color-primary);
        }

        .google-login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: var(--text-primary);
          color: white;
          border: none;
          border-radius: var(--radius-full);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-md);
        }

        .google-login-btn:hover {
          background: #333;
          transform: translateY(-1px);
          box-shadow: var(--shadow-lg);
        }

        .google-login-btn:active {
          transform: translateY(0);
        }

        .login-disclaimer {
          font-size: 0.68rem;
          color: var(--text-muted);
          max-width: 260px;
        }
      `}</style>
    </div>
  );
};
