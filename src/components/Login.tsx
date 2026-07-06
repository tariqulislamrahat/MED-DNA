import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { ArrowRight, X, UserPlus } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, language, setLanguage, t } = useMed();
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('alex.mercer@gmail.com');
  const [customName, setCustomName] = useState('Alex Mercer');

  const handleSelectAccount = async (email: string, name: string) => {
    setLoading(true);
    try {
      await login(email, name);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setShowSelector(false);
    }
  };

  const handleGoogleLogin = React.useCallback(async (token: string) => {
    setLoading(true);
    try {
      await login(undefined, undefined, token);
    } catch (e) {
      console.error("Google login failed", e);
    } finally {
      setLoading(false);
      setShowSelector(false);
    }
  }, [login]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customName.trim()) return;
    handleSelectAccount(customEmail, customName);
  };

  const handleDirectLogin = async () => {
    setLoading(true);
    try {
      await login('alex.mercer@gmail.com', 'Alex Mercer');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let interval: any;
    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientID) return;

    const initGoogle = () => {
      if (window.google) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: clientID,
            callback: (response: any) => {
              handleGoogleLogin(response.credential);
            },
            auto_select: false
          });

          const btnParent = document.getElementById("google-signin-btn-real");
          if (btnParent) {
            window.google.accounts.id.renderButton(btnParent, {
              theme: "outline",
              size: "large",
              width: 280,
              type: "standard",
              shape: "pill",
              text: "continue_with",
              logo_alignment: "left"
            });
          }

          window.google.accounts.id.prompt();
        } catch (err) {
          console.error("Failed to initialize Google Identity Services:", err);
        }
      }
    };

    initGoogle();
    interval = setInterval(initGoogle, 500);
    return () => clearInterval(interval);
  }, [handleGoogleLogin]);

  return (
    <div className="login-page">

      {/* Center content */}
      <div className="login-center">
        {/* Brand */}
        <div className="login-brand">
          <span className="login-char">M</span>
          <span className="login-char">E</span>
          <span className="login-capsule">
            <span className="login-char login-char--white login-char--flipped">D</span>
            <span className="login-char login-char--white">D</span>
          </span>
          <span className="login-char">N</span>
          <span className="login-char">A</span>
        </div>

        {/* Tagline */}
        <p className="login-tagline">{language === 'bn' ? 'আপনার প্রেসক্রিপশন সঙ্গী' : 'YOUR PRESCRIPTION COMPANION'}</p>

        {/* Google Sign-In */}
        <div className="login-action">
          <div className="login-google-wrap">
            {/* Visual custom button (underneath) */}
            <div className="login-google-btn" aria-hidden="true">
              {loading ? (
                <div className="login-spinner login-spinner--sm" />
              ) : (
                <>
                  <div className="login-g-icon-wrap">
                    <svg className="login-g-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <span className="login-g-text">{t('continueGoogle')}</span>
                  <ArrowRight size={15} className="login-arrow" />
                </>
              )}
            </div>
            {/* Real Google button (invisible overlay — captures clicks) */}
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div id="google-signin-btn-real" className="login-gsi-overlay" />
            ) : (
              <button className="login-gsi-overlay login-gsi-fallback" onClick={handleDirectLogin} disabled={loading} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p className="login-terms">
          {t('termsNotice')}
        </p>
      </footer>

      {/* Language toggle — very subtle, top-right */}
      <button
        type="button"
        className="login-lang"
        onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
      >
        {language === 'en' ? 'বাংলা' : 'EN'}
      </button>

      {/* Google Sign-in Selector Modal (fallback/demo) */}
      {showSelector && (
        <div className="google-overlay">
          <div className="google-modal">
            <div className="google-header">
              <svg width="24" height="24" viewBox="0 0 24 24" className="g-logo">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <h3>{t('gSignInTitle')}</h3>
              <p>{t('gSignInSub')}</p>
              <button className="g-close-btn" onClick={() => { setShowSelector(false); setCustomMode(false); }} disabled={loading}>
                <X size={16} />
              </button>
            </div>
            {loading ? (
              <div className="google-loading-body">
                <div className="login-spinner" />
                <p>{t('gAuth')}</p>
              </div>
            ) : customMode ? (
              <form onSubmit={handleCustomSubmit} className="g-custom-form">
                <div className="g-input-group">
                  <label>{t('gFullName')}</label>
                  <input type="text" className="g-input" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. John Doe" required autoFocus />
                </div>
                <div className="g-input-group">
                  <label>{t('gEmailAddress')}</label>
                  <input type="email" className="g-input" value={customEmail} onChange={e => setCustomEmail(e.target.value)} placeholder="e.g. john.doe@gmail.com" required />
                </div>
                <div className="g-form-actions">
                  <button type="button" className="g-back-btn" onClick={() => setCustomMode(false)}>{t('gBackToAccounts')}</button>
                  <button type="submit" className="g-submit-btn">{t('gSignInBtn')}</button>
                </div>
              </form>
            ) : (
              <div className="google-accounts-list">
                <button className="g-account-item" onClick={() => handleSelectAccount('alex.mercer@gmail.com', 'Alex Mercer')}>
                  <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop" alt="Alex" className="g-avatar" />
                  <div className="g-profile-details"><span className="g-name">Alex Mercer</span><span className="g-email">alex.mercer@gmail.com</span></div>
                </button>
                <button className="g-account-item" onClick={() => handleSelectAccount('sarah.mercer@meddna.org', 'Sarah Mercer')}>
                  <div className="g-avatar-fallback">S</div>
                  <div className="g-profile-details"><span className="g-name">Sarah Mercer (Demo Wife)</span><span className="g-email">sarah.mercer@meddna.org</span></div>
                </button>
                <button className="g-account-item use-different" onClick={() => setCustomMode(true)}>
                  <div className="g-avatar-icon"><UserPlus size={16} /></div>
                  <div className="g-profile-details"><span className="g-name">{t('gUseAnother')}</span><span className="g-email">{t('gCustomNotice')}</span></div>
                </button>
              </div>
            )}
            <div className="google-footer"><span>{t('gFooter')}</span></div>
          </div>
        </div>
      )}

      <style>{`
        /* ============================================
           LOGIN — FULL-PAGE MINIMAL (OpenDrive style)
           White background, red accent, MedDNA brand
           ============================================ */

        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          position: relative;
          overflow: hidden;
        }

        /* Subtle radial glow behind center content */
        .login-page::before {
          content: '';
          position: absolute;
          width: 800px;
          height: 800px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(229, 62, 62, 0.04) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        /* Center content group */
        .login-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          z-index: 1;
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Brand — logo container */
        .login-brand {
          user-select: none;
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) both;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: var(--font-display), var(--font-sans), sans-serif;
          font-size: clamp(3.2rem, 8vw, 4.8rem);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .login-char {
          display: inline-block;
          color: #111827;
        }

        .login-capsule {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ff3b30; /* Premium iOS Red */
          border-radius: 999px; /* Capsule shape */
          padding: 0 0.28em;
          margin: 0 0.08em;
          height: 1.15em;
          box-shadow: 0 4px 12px rgba(255, 59, 48, 0.2);
        }

        .login-capsule .login-char {
          font-size: 0.82em; /* Scale Ds down slightly so they have padding inside the capsule */
          line-height: 1;
        }

        .login-char--white {
          color: #ffffff !important;
        }

        .login-char--flipped {
          transform: scaleX(-1);
          margin-right: -0.01em; /* Close the gap between Ds inside the capsule */
        }

        .login-capsule .login-char:not(.login-char--flipped) {
          margin-left: -0.01em;
        }

        /* Tagline */
        .login-tagline {
          font-size: 0.68rem;
          letter-spacing: 0.3em;
          color: #b0b7c3;
          font-weight: 500;
          margin-top: -0.5rem;
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }

        /* Sign-in action area */
        .login-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.5rem;
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }

        /* Button wrapper — stacks visual + real button */
        .login-google-wrap {
          position: relative;
          min-width: 280px;
          cursor: pointer;
        }

        .login-google-wrap:hover .login-google-btn {
          border-color: #d0d4da;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }

        .login-google-wrap:hover .login-arrow {
          opacity: 0.6;
          transform: translateX(3px);
        }

        .login-google-wrap:hover .login-google-btn::before {
          opacity: 1;
        }

        .login-google-wrap:active .login-google-btn {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        /* Invisible overlay — real Google button or fallback sits here */
        .login-gsi-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.01;
          cursor: pointer;
          z-index: 2;
        }

        .login-gsi-fallback {
          background: transparent;
          border: none;
        }

        /* Custom Google button — premium pill */
        .login-google-btn {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0;
          min-width: 280px;
          background: #ffffff;
          color: #3c4043;
          border: 1.5px solid #e2e5e9;
          border-radius: 100px;
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 52px;
          position: relative;
          overflow: hidden;
        }

        .login-google-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(66,133,244,0.03) 0%, rgba(234,67,53,0.03) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .login-g-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          border-right: 1px solid #eef0f2;
        }

        .login-g-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .login-g-text {
          flex: 1;
          text-align: center;
          padding: 0 0.5rem;
          letter-spacing: 0.01em;
        }

        .login-arrow {
          margin-right: 1.25rem;
          opacity: 0.25;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .login-google-btn:hover .login-arrow {
          opacity: 0.6;
          transform: translateX(3px);
        }

        /* Loading */
        .login-loading {
          display: flex;
          justify-content: center;
          padding: 0.5rem 0;
        }

        .login-spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid #f3f4f6;
          border-top: 2.5px solid #dc2626;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .login-spinner--sm {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }

        /* Footer */
        .login-footer {
          position: absolute;
          bottom: 2.5rem;
          z-index: 1;
          animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
        }

        .login-terms {
          font-size: 0.72rem;
          color: #b0b0b0;
          text-align: center;
          line-height: 1.6;
        }

        .login-terms a {
          color: #9ca3af;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }

        .login-terms a:hover {
          color: #dc2626;
        }

        /* Language toggle */
        .login-lang {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 2;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 0.3rem 0.7rem;
          font-size: 0.68rem;
          font-weight: 600;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.02em;
        }

        .login-lang:hover {
          border-color: #d1d5db;
          color: #6b7280;
        }

        /* ============================================
           GOOGLE ACCOUNTS SELECTOR MODAL
           ============================================ */

        .google-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: overlayIn 0.2s ease both;
        }

        @keyframes overlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .google-modal {
          max-width: 420px;
          width: 100%;
          background: #ffffff;
          border-radius: 16px;
          padding: 2rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          color: #202124;
          text-align: left;
          box-shadow: 0 24px 80px -12px rgba(0, 0, 0, 0.18);
          animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes modalIn {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .google-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          width: 100%;
        }

        .g-logo { margin-bottom: 0.5rem; }

        .google-header h3 {
          font-size: 1.35rem;
          font-weight: 600;
          color: #202124;
        }

        .google-header p {
          font-size: 0.85rem;
          color: #5f6368;
          margin-top: 0.25rem;
        }

        .g-close-btn {
          position: absolute;
          top: -10px; right: -5px;
          background: transparent;
          border: none;
          color: #5f6368;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
        }

        .g-close-btn:hover {
          background: #f1f3f4;
          color: #202124;
        }

        .google-accounts-list {
          display: flex;
          flex-direction: column;
          border: 1px solid #dadce0;
          border-radius: 8px;
          overflow: hidden;
        }

        .g-account-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-bottom: 1px solid #dadce0;
          cursor: pointer;
          transition: background 0.15s ease;
          text-align: left;
        }

        .g-account-item:last-child { border-bottom: none; }
        .g-account-item:hover { background: #f8f9fa; }

        .g-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }

        .g-avatar-fallback {
          width: 32px; height: 32px; border-radius: 50%;
          background: #1a73e8; color: white; font-weight: 700;
          display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
        }

        .g-avatar-icon {
          width: 32px; height: 32px; border-radius: 50%;
          background: #f1f3f4; color: #5f6368;
          display: flex; align-items: center; justify-content: center;
        }

        .g-profile-details { display: flex; flex-direction: column; min-width: 0; }

        .g-name { font-size: 0.85rem; font-weight: 600; color: #3c4043; }

        .g-email {
          font-size: 0.75rem; color: #5f6368;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .use-different .g-name { color: #1a73e8; }

        .google-loading-body {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 2rem 0; gap: 1rem;
          color: #5f6368; font-size: 0.85rem;
        }

        .g-custom-form { display: flex; flex-direction: column; gap: 1rem; }

        .g-input-group { display: flex; flex-direction: column; gap: 0.3rem; }

        .g-input-group label {
          font-size: 0.75rem; font-weight: 600; color: #5f6368; text-transform: uppercase;
        }

        .g-input {
          padding: 0.6rem 0.75rem; border: 1px solid #dadce0; border-radius: 6px;
          font-size: 0.88rem; outline: none; color: #202124; transition: border-color 0.15s ease;
        }

        .g-input:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.15); }

        .g-form-actions {
          display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;
        }

        .g-back-btn {
          background: transparent; border: none; color: #5f6368;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
        }

        .g-back-btn:hover { color: #202124; text-decoration: underline; }

        .g-submit-btn {
          background: #1a73e8; color: white; border: none;
          padding: 0.55rem 1.25rem; border-radius: 4px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
        }

        .g-submit-btn:hover { background: #1557b0; }

        .google-footer {
          font-size: 0.7rem; color: #70757a; line-height: 1.4;
          border-top: 1px solid #f1f3f4; padding-top: 0.85rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-brand { font-size: 2.5rem; }
          .login-footer { bottom: 1.5rem; padding: 0 1.5rem; }
        }
      `}</style>
    </div>
  );
};
