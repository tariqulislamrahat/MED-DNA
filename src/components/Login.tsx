import React, { useState } from 'react';
import { useMed } from '../context/MedContext';
import { Sparkles, X, UserPlus } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, language, setLanguage, t } = useMed();
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

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

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customName.trim()) return;
    handleSelectAccount(customEmail, customName);
  };

  return (
    <div className="login-page">
      <div className="login-card glass-card">
        {/* Language Toggle */}
        <div style={{ alignSelf: 'flex-end', marginBottom: '-0.75rem' }}>
          <button 
            type="button"
            className="sidebar-lang-btn"
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', height: 'auto' }}
          >
            <span>🌐</span>
            <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>

        <div className="login-logo-wrapper">
          <div className="login-logo-mark">
            <span>M</span>
          </div>
          <h1 className="login-brand">Med<span className="login-accent">DNA</span></h1>
        </div>

        <p className="login-tagline">{t('loginTagline')}</p>

        <div className="login-features-row">
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>{t('aiOcrScanner')}</span>
          </div>
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>{t('tracker')}</span>
          </div>
          <div className="login-feature-chip">
            <Sparkles size={12} />
            <span>{t('smartReminders')}</span>
          </div>
        </div>

        <button className="google-login-btn" onClick={() => setShowSelector(true)}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58(9 3.58z" fill="#EA4335"/>
          </svg>
          <span>{t('continueGoogle')}</span>
        </button>

        <p className="login-disclaimer">{t('termsNotice')}</p>
      </div>

      {/* Google Sign-in Selector Modal */}
      {showSelector && (
        <div className="google-overlay">
          <div className="google-modal glass-card">
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
                <div className="g-spinner" />
                <p>{t('gAuth')}</p>
              </div>
            ) : customMode ? (
              <form onSubmit={handleCustomSubmit} className="g-custom-form">
                <div className="g-input-group">
                  <label>{t('gFullName')}</label>
                  <input 
                    type="text" 
                    className="g-input" 
                    value={customName} 
                    onChange={e => setCustomName(e.target.value)} 
                    placeholder="e.g. John Doe"
                    required 
                    autoFocus
                  />
                </div>
                <div className="g-input-group">
                  <label>{t('gEmailAddress')}</label>
                  <input 
                    type="email" 
                    className="g-input" 
                    value={customEmail} 
                    onChange={e => setCustomEmail(e.target.value)} 
                    placeholder="e.g. john.doe@gmail.com"
                    required 
                  />
                </div>
                <div className="g-form-actions">
                  <button type="button" className="g-back-btn" onClick={() => setCustomMode(false)}>
                    {t('gBackToAccounts')}
                  </button>
                  <button type="submit" className="g-submit-btn">
                    {t('gSignInBtn')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="google-accounts-list">
                {/* Account 1 */}
                <button 
                  className="g-account-item" 
                  onClick={() => handleSelectAccount('alex.mercer@gmail.com', 'Alex Mercer')}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop" 
                    alt="Alex avatar" 
                    className="g-avatar" 
                  />
                  <div className="g-profile-details">
                    <span className="g-name">Alex Mercer</span>
                    <span className="g-email">alex.mercer@gmail.com</span>
                  </div>
                </button>

                {/* Account 2 */}
                <button 
                  className="g-account-item" 
                  onClick={() => handleSelectAccount('sarah.mercer@meddna.org', 'Sarah Mercer')}
                >
                  <div className="g-avatar-fallback">S</div>
                  <div className="g-profile-details">
                    <span className="g-name">Sarah Mercer (Demo Wife)</span>
                    <span className="g-email">sarah.mercer@meddna.org</span>
                  </div>
                </button>

                {/* Account 3 - Use Another */}
                <button 
                  className="g-account-item use-different" 
                  onClick={() => setCustomMode(true)}
                >
                  <div className="g-avatar-icon"><UserPlus size={16} /></div>
                  <div className="g-profile-details">
                    <span className="g-name">{t('gUseAnother')}</span>
                    <span className="g-email">{t('gCustomNotice')}</span>
                  </div>
                </button>
              </div>
            )}

            <div className="google-footer">
              <span>{t('gFooter')}</span>
            </div>
          </div>
        </div>
      )}

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
          border: 1px solid var(--border-color);
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

        /* Google accounts selector popup */
        .google-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .google-modal {
          max-width: 440px;
          width: 100%;
          background: #ffffff;
          border-radius: var(--radius-md);
          padding: 2rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
          color: #202124;
          text-align: left;
        }

        .google-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          width: 100%;
        }

        .g-logo {
          margin-bottom: 0.5rem;
        }

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
          top: -10px;
          right: -5px;
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

        .g-account-item:last-child {
          border-bottom: none;
        }

        .g-account-item:hover {
          background: #f8f9fa;
        }

        .g-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .g-avatar-fallback {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #1a73e8;
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }

        .g-avatar-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f3f4;
          color: #5f6368;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .g-profile-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .g-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #3c4043;
        }

        .g-email {
          font-size: 0.75rem;
          color: #5f6368;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .use-different .g-name {
          color: #1a73e8;
        }

        .google-loading-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 0;
          gap: 1rem;
          color: #5f6368;
          font-size: 0.85rem;
        }

        .g-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #1a73e8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Custom input form style */
        .g-custom-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .g-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .g-input-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #5f6368;
          text-transform: uppercase;
        }

        .g-input {
          padding: 0.6rem 0.75rem;
          border: 1px solid #dadce0;
          border-radius: 6px;
          font-size: 0.88rem;
          outline: none;
          color: #202124;
          transition: border-color 0.15s ease;
        }

        .g-input:focus {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.15);
        }

        .g-form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
        }

        .g-back-btn {
          background: transparent;
          border: none;
          color: #5f6368;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .g-back-btn:hover {
          color: #202124;
          text-decoration: underline;
        }

        .g-submit-btn {
          background: #1a73e8;
          color: white;
          border: none;
          padding: 0.55rem 1.25rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }

        .g-submit-btn:hover {
          background: #1557b0;
        }

        .google-footer {
          font-size: 0.7rem;
          color: #70757a;
          line-height: 1.4;
          border-top: 1px solid #f1f3f4;
          padding-top: 0.85rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
