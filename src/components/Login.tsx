import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { 
  ShieldAlert, 
  ScanLine, 
  MapPin, 
  Heart
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useMed();
  const [loading, setLoading] = useState(false);

  const handleLoginClick = async () => {
    setLoading(true);
    try {
      await login();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      
      {/* Background glowing blobs */}
      <div className="bg-blob cyan" />
      <div className="bg-blob purple" />

      <div className="login-card-box glass-card">
        
        {/* Logo Branding */}
        <div className="login-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 10.5C4.5 7.46243 6.96243 5 10 5C13.0376 5 15.5 7.46243 15.5 10.5C15.5 12.0188 14.8826 13.3938 13.8826 14.3938M4.5 10.5C4.5 13.5376 6.96243 16 10 16C11.5188 16 12.8938 15.3826 13.8826 14.3938M4.5 10.5H15.5M13.8826 14.3938L19.5 20M13.8826 14.3938C13.8826 14.3938 15.5 14.5 17 13C18.5 11.5 18.5 9.5 18.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="10" cy="5" r="1.5" fill="currentColor"/>
              <circle cx="4.5" cy="10.5" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
              <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <h1>Med<span className="text-glow">DNA</span></h1>
        </div>

        <p className="tagline">Your Intelligent AI Medication Companion</p>

        {/* Feature List */}
        <div className="features-list">
          <div className="feature-item">
            <div className="feat-icon"><ScanLine size={18} /></div>
            <div>
              <h5>Prescription Handwriting OCR</h5>
              <p>Scan doctor scripts to instantly extract dosage timelines.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feat-icon"><ShieldAlert size={18} /></div>
            <div>
              <h5>Clinical Interaction warnings</h5>
              <p>AI scans active medications to flag dangerous overlaps.</p>
            </div>
          </div>

          <div className="feature-item">
            <div className="feat-icon"><MapPin size={18} /></div>
            <div>
              <h5>Pharmacy Price comparisons</h5>
              <p>Compare total prescriptions across stores and save up to 25%.</p>
            </div>
          </div>
        </div>

        {/* Google Authentication Button */}
        <button 
          className="google-signin-btn" 
          onClick={handleLoginClick}
          disabled={loading}
        >
          {loading ? (
            <div className="small-spinner" />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          )}
          <span>{loading ? "Authenticating session..." : "Continue with Google"}</span>
        </button>

        <div className="login-footer">
          <Heart size={12} className="heart-pulse" />
          <span>Secured clinical-grade privacy shielding</span>
        </div>

      </div>

      <style>{`
        .login-page-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #07090e;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1.5rem;
          overflow: hidden;
        }

        .bg-blob {
          position: absolute;
          width: 350px;
          height: 350px;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          pointer-events: none;
        }

        .bg-blob.cyan {
          background-color: var(--color-primary);
          top: 15%;
          left: 15%;
        }

        .bg-blob.purple {
          background-color: var(--color-secondary);
          bottom: 15%;
          right: 15%;
        }

        .login-card-box {
          max-width: 440px;
          width: 100%;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          background: var(--gradient-primary);
          color: white;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px var(--color-primary-glow);
        }

        .login-logo h1 {
          font-size: 2.2rem;
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .text-glow {
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tagline {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: -0.5rem;
        }

        .features-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          text-align: left;
          margin: 1rem 0;
        }

        .feature-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .feat-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .feature-item h5 {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .feature-item p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .google-signin-btn {
          width: 100%;
          background: white;
          color: #1f2937;
          border: none;
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.95rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }

        .google-signin-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 255, 255, 0.1);
        }

        .google-signin-btn:active {
          transform: translateY(0);
        }

        .small-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: #4285F4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .login-footer {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 1rem;
        }

        .heart-pulse {
          color: var(--color-danger);
          animation: pulseGlow 1.5s infinite;
        }
      `}</style>

    </div>
  );
};
