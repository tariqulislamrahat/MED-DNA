import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, RefreshCw } from 'lucide-react';
import { useMed } from '../context/MedContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isDeclined?: boolean;
}

const fetchWithRetry = async (url: string, options: RequestInit, retries: number = 3, delay: number = 1000): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

export const AiGuide: React.FC = () => {
  const { language, t, user } = useMed();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: t('aiGreeting')
      }
    ]);
  }, [language]);

  const suggestionChips = language === 'bn' ? [
    "লিসিনোপ্রিলের পার্শ্বপ্রতিক্রিয়া কি কি?",
    "আমি কি অ্যাসপিরিনের সাথে অ্যাডভিল নিতে পারি?",
    "রাতে অ্যাটোরভাস্ট্যাটিন নেওয়ার পরামর্শ দেওয়া হয় কেন?",
    "অ্যামোক্সিসিলিন কীভাবে ব্যাকটেরিয়াল ইনফেকশন নিরাময় করে?"
  ] : [
    "What are side effects of Lisinopril?",
    "Can I take Aspirin with Advil?",
    "Why is taking Atorvastatin at night recommended?",
    "How does Amoxicillin treat bacterial infections?"
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Build message payload from history (excluding system prompt which backend prepends)
      const payloadMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetchWithRetry(`${API_BASE}/api/chat-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: payloadMessages, language })
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      
      // Check if response contains declination indicators
      const contentUpper = data.reply.toUpperCase();
      const isDeclined = contentUpper.includes("DECLINE") || 
                         contentUpper.includes("UNABLE TO ANSWER") || 
                         contentUpper.includes("ONLY ASSIST WITH MEDICAL") ||
                         contentUpper.includes("প্রত্যাখ্যান") ||
                         contentUpper.includes("দুঃখিত, আমি কেবল");

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: data.reply,
          isDeclined
        }
      ]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: t('aiErrorConnecting')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: language === 'bn' ? 'চ্যাট ইতিহাস মুছে ফেলা হয়েছে। শুরু করতে যেকোনো ওষুধ বা ক্লিনিক্যাল নিরাপত্তা সম্পর্কিত প্রশ্ন জিজ্ঞাসা করুন।' : "Chat logs cleared. Ask me any medication or clinical safety questions to begin again."
      }
    ]);
  };

  return (
    <div className="ai-guide-view animate-fade-in">
      <header className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('aiGuideHeader')}</h1>
          <p>{t('aiGuideSub')}</p>
        </div>
        <button className="btn btn-secondary btn-xs" onClick={handleResetChat} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={12} /> {t('clearChat')}
        </button>
      </header>

      <div className="chat-layout-container">
        {/* Left column: active chat box */}
        <div className="glass-card chat-box-card">
          <div className="chat-header-banner">
            <span className="ribbon-capsule">
              <span className="ribbon-char ribbon-char--white ribbon-char--flipped">D</span>
              <span className="ribbon-char ribbon-char--white">D</span>
            </span>
            <span>{t('aiBanner')}</span>
          </div>

          <div className="chat-messages-area">
            {messages.map((msg, idx) => (
               <div key={idx} className={`chat-message-bubble ${msg.role === 'user' ? 'msg-user' : 'msg-ai'} ${msg.isDeclined ? 'msg-declined' : ''}`}>
                 {msg.role === 'user' ? (
                   user && user.avatar ? (
                     <img src={user.avatar} className="message-avatar message-avatar-img" alt="User" />
                   ) : (
                     <div className="message-avatar">
                       {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                     </div>
                   )
                 ) : (
                   <div className="message-avatar msg-ai-avatar">
                     <span className="logo-d-flipped">D</span>
                     <span className="logo-d">D</span>
                   </div>
                 )}
                 <div className="message-content-wrapper">
                   <p className="message-text">{msg.content}</p>
                   {msg.isDeclined && (
                     <span className="decline-warning-badge">
                       <AlertCircle size={10} /> {t('nonMedicalRestricted')}
                     </span>
                   )}
                 </div>
               </div>
             ))}
             {loading && (
               <div className="chat-message-bubble msg-ai msg-loading">
                 <div className="message-avatar msg-ai-avatar">
                   <span className="logo-d-flipped">D</span>
                   <span className="logo-d">D</span>
                 </div>
                <div className="loading-bubbles">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-input-row">
            <input 
              type="text" 
              className="chat-input-field" 
              placeholder={t('chatPlaceholder')}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="chat-send-btn" disabled={loading || !inputValue.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Right column: active context & quick chips */}
        <div className="chat-sidebar-panel">
          <div className="glass-card sidebar-card">
            <h3>{t('quickSuggestions')}</h3>
            <p className="sidebar-desc">{t('quickSuggestionsDesc')}</p>
            <div className="suggestions-stack">
              {suggestionChips.map((chip, idx) => (
                <button 
                  key={idx} 
                  className="suggestion-chip-btn" 
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card sidebar-card border-accent" style={{ marginTop: '1.25rem' }}>
            <h3>{t('guidanceSafeguards')}</h3>
            <ul className="safeguard-bullet-list">
              <li>{t('safeguard1')}</li>
              <li>{t('safeguard2')}</li>
              <li>{t('safeguard3')}</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .ai-guide-view {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: calc(100vh - 120px);
        }

        .chat-layout-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          flex: 1;
          min-height: 0; /* Important for flex container inner scrolling */
        }

        @media (max-width: 900px) {
          .chat-layout-container {
            grid-template-columns: 1fr;
          }
          .chat-sidebar-panel {
            display: none; /* Hide sidebar on mobile to save vertical space */
          }
        }

        .chat-box-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 450px;
          padding: 0 !important;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .chat-header-banner {
          background: rgba(229, 57, 53, 0.04);
          border-bottom: 1px solid var(--border-color);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ribbon-capsule {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          border-radius: 99px;
          padding: 0 0.22em;
          margin-right: 0.1em;
          height: 1.25em;
          font-family: var(--font-display), var(--font-sans), sans-serif;
          font-size: 0.95rem;
          font-weight: 900;
          box-shadow: 0 2px 6px var(--color-primary-glow);
        }

        .ribbon-char {
          display: inline-block;
          font-size: 0.8em;
          line-height: 1;
        }

        .ribbon-char--white {
          color: #ffffff !important;
        }

        .ribbon-char--flipped {
          transform: scaleX(-1);
          margin-right: -0.02em;
        }

        .ribbon-capsule .ribbon-char:not(.ribbon-char--flipped) {
          margin-left: -0.02em;
        }

        .chat-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background: rgba(255, 255, 255, 0.005);
        }

        .chat-message-bubble {
          display: flex;
          gap: 0.85rem;
          max-width: 80%;
          align-self: flex-start;
        }

        .chat-message-bubble.msg-user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .message-avatar-img {
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .msg-ai-avatar {
          background: var(--color-danger) !important;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 1px;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
        }

        .logo-d-flipped {
          display: inline-block;
          transform: scaleX(-1);
          color: white;
          font-weight: 900;
          font-family: var(--font-sans);
          font-size: 0.75rem;
        }

        .logo-d {
          display: inline-block;
          color: white;
          font-weight: 900;
          font-family: var(--font-sans);
          font-size: 0.75rem;
        }

        .msg-ai .message-avatar {
          background: var(--color-primary);
          color: white;
        }

        .msg-user .message-avatar {
          background: var(--color-accent);
          color: white;
        }

        .message-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .message-text {
          padding: 0.8rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          line-height: 1.45;
          margin: 0;
        }

        .msg-ai .message-text {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .msg-user .message-text {
          background: var(--color-primary);
          color: white;
        }

        .msg-declined .message-text {
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.03);
        }

        .decline-warning-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.68rem;
          color: var(--color-danger);
          font-weight: 600;
          margin-top: 0.15rem;
          margin-left: 0.25rem;
        }

        .chat-input-row {
          display: flex;
          border-top: 1px solid var(--border-color);
          background: rgba(255,255,255,0.005);
          padding: 0.75rem 1rem;
          gap: 0.75rem;
        }

        .chat-input-field {
          flex: 1;
          background: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          padding: 0.65rem 1.25rem;
          color: var(--text-primary);
          font-size: 0.88rem;
          outline: none;
        }

        .chat-input-field:focus {
          border-color: var(--color-primary);
        }

        .chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--color-primary);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .chat-send-btn:hover {
          background: #312e81; /* Dark indigo */
        }

        .chat-send-btn:disabled {
          background: var(--border-color);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        /* Loading animation dots */
        .msg-loading .loading-bubbles {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0.8rem 1.2rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .loading-bubbles span {
          width: 6px;
          height: 6px;
          background: var(--color-primary);
          border-radius: 50%;
          animation: dot-pulse 1.4s infinite ease-in-out both;
        }

        .loading-bubbles span:nth-child(1) { animation-delay: -0.32s; }
        .loading-bubbles span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes dot-pulse {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }

        /* Sidebar styling */
        .chat-sidebar-panel {
          display: flex;
          flex-direction: column;
        }

        .sidebar-card h3 {
          font-size: 0.95rem;
          font-weight: bold;
          margin-bottom: 0.4rem;
        }

        .sidebar-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .suggestions-stack {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .suggestion-chip-btn {
          width: 100%;
          text-align: left;
          padding: 0.6rem 0.85rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 0.76rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-chip-btn:hover {
          background: rgba(6, 182, 212, 0.04);
          border-color: rgba(6, 182, 212, 0.3);
          color: var(--color-accent);
        }

        .border-accent {
          border-color: rgba(6, 182, 212, 0.2);
        }

        .safeguard-bullet-list {
          padding-left: 1.1rem;
          font-size: 0.76rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin: 0.5rem 0 0 0;
        }

        @media (max-width: 900px) {
          .chat-layout-container {
            grid-template-columns: 1fr;
          }
          .chat-sidebar-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
