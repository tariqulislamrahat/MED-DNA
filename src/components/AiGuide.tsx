import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isDeclined?: boolean;
}

export const AiGuide: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your MedDNA AI Health Guide. I am programmed to assist you with medical queries, drug interactions, usage guidelines, safety profiles, and general health inquiries. Please note that I am strictly restricted to health and medicine topics."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
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

      const res = await fetch('/api/chat-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: payloadMessages })
      });

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      
      // Check if response contains declination indicators
      const contentUpper = data.reply.toUpperCase();
      const isDeclined = contentUpper.includes("DECLINE") || 
                         contentUpper.includes("UNABLE TO ANSWER") || 
                         contentUpper.includes("ONLY ASSIST WITH MEDICAL");

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
          content: "Sorry, I am having trouble connecting to my clinical AI model right now. Please try again in a few moments." 
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
        content: "Chat logs cleared. Ask me any medication or clinical safety questions to begin again."
      }
    ]);
  };

  return (
    <div className="ai-guide-view animate-fade-in">
      <header className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>AI Health Assistant</h1>
          <p>Consult with MedDNA's specialized AI guide on drug dosages, warnings, and wellness recommendations.</p>
        </div>
        <button className="btn btn-secondary btn-xs" onClick={handleResetChat} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={12} /> Clear Chat
        </button>
      </header>

      <div className="chat-layout-container">
        {/* Left column: active chat box */}
        <div className="glass-card chat-box-card">
          <div className="chat-header-banner">
            <Sparkles size={16} className="sparkle-icon" />
            <span>MedDNA AI Guide • Clinical Safety Filter Active</span>
          </div>

          <div className="chat-messages-area">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message-bubble ${msg.role === 'user' ? 'msg-user' : 'msg-ai'} ${msg.isDeclined ? 'msg-declined' : ''}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className="message-content-wrapper">
                  <p className="message-text">{msg.content}</p>
                  {msg.isDeclined && (
                    <span className="decline-warning-badge">
                      <AlertCircle size={10} /> Non-medical topic restricted
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message-bubble msg-ai msg-loading">
                <div className="message-avatar">AI</div>
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
              placeholder="Ask about side effects, safety guidelines, interactions..."
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
            <h3>Quick Query Suggestions</h3>
            <p className="sidebar-desc">Tap one of the prompts below to automatically ask the guide:</p>
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
            <h3>Guidance Safeguards</h3>
            <ul className="safeguard-bullet-list">
              <li>Answers are filtered to prevent medical diagnosis or surgical advice.</li>
              <li>Only handles clinical drug, disease, prescription, and wellness queries.</li>
              <li>System strictly refuses non-medical topics (e.g. general code, business, math).</li>
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
          background: rgba(6, 182, 212, 0.08);
          border-bottom: 1px solid var(--border-color);
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-accent);
        }

        .sparkle-icon {
          animation: pulse 1.5s infinite;
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
      `}</style>
    </div>
  );
};
