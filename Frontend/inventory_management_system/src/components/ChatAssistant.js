import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import './ChatAssistant.css';
import { apiUrl } from '../config/api';

const getDeskPortalRoot = () => {
  let root = document.getElementById('ims-desk-portal');
  if (!root) {
    root = document.createElement('div');
    root.id = 'ims-desk-portal';
    document.body.appendChild(root);
  }
  return root;
};

const ADMIN_PROMPT_CARDS = [
  { title: 'Stock overview', desc: 'Live counts & alerts', message: 'Stock overview' },
  { title: 'Low stock', desc: 'Priority items', message: 'Low stock items' },
  { title: 'Geography', desc: 'Ask anything global', message: 'Explain Indian geography' },
];

const CUSTOMER_PROMPT_CARDS = [
  { title: 'Browse', desc: 'Product catalog', message: 'Browse products' },
  { title: 'My cart', desc: 'Checkout help', message: 'Check my cart' },
  { title: 'Help', desc: 'Using the store', message: 'Help using the store' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ChatAssistant = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  const promptCards = user?.role === 'customer' ? CUSTOMER_PROMPT_CARDS : ADMIN_PROMPT_CARDS;
  const firstName = user?.name?.split(' ')[0] || 'there';
  const showHero = messages.filter((m) => m.role === 'user').length === 0 && !loading;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) {
      document.body.classList.add('ims-desk-panel-open');
    } else {
      document.body.classList.remove('ims-desk-panel-open');
    }
    return () => document.body.classList.remove('ims-desk-panel-open');
  }, [open]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('auth-token');
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-token': token,
        },
        body: JSON.stringify({ message: trimmed, history }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      if (!data.reply) {
        throw new Error('No reply from support desk');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          time: new Date(),
        },
      ]);
    } catch (err) {
      const isNetwork =
        err?.message === 'Failed to fetch' || err?.name === 'TypeError';
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: isNetwork
            ? 'Unable to connect. Ensure the backend is running on port 3001.'
            : err?.message || 'Something went wrong. Please try again.',
          time: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderMarkdownLite = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </React.Fragment>
      ));
    });
  };

  if (!user) return null;

  const deskUi = (
    <div className={`ims-desk ${open ? 'ims-desk--open' : ''}`} aria-live="polite">
      {open && (
        <button
          type="button"
          className="ims-desk-backdrop"
          aria-label="Close"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="ims-desk-panel" role="dialog" aria-label="IMS AI Chat">
          <header className="ims-desk-topbar">
            <div className="ims-desk-brand">
              <span className="ims-desk-brand-icon">I</span>
              <span className="ims-desk-brand-name">IMS</span>
            </div>
            <button
              type="button"
              className="ims-desk-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <Icons.Close size={16} strokeWidth={2} />
            </button>
          </header>

          <div className="ims-desk-body-layout">
            <aside className="ims-desk-sidebar" aria-label="Chat navigation">
              <button type="button" className="ims-desk-nav ims-desk-nav--active" title="Chat">
                <Icons.SupportDesk size={18} strokeWidth={1.75} />
              </button>
              <button type="button" className="ims-desk-nav" title="Stock" onClick={() => sendMessage('Stock overview')}>
                <Icons.Stock size={18} strokeWidth={1.75} />
              </button>
              <button type="button" className="ims-desk-nav" title="Analytics" onClick={() => sendMessage('Show analytics help')}>
                <Icons.FeatureChart size={18} strokeWidth={1.75} />
              </button>
            </aside>

            <main className="ims-desk-main">
              <div className="ims-desk-thread" ref={bodyRef}>
                {showHero && (
                  <div className="ims-desk-hero">
                    <div className="ims-desk-orb" aria-hidden="true" />
                    <h3 className="ims-desk-hero-title">
                      {getGreeting()}, {firstName}.
                    </h3>
                    <p className="ims-desk-hero-sub">Can I help you with anything?</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <article
                    key={msg.id}
                    className={`ims-desk-msg ims-desk-msg--${msg.role} ${
                      msg.isError ? 'ims-desk-msg--error' : ''
                    }`}
                  >
                    <div className="ims-desk-msg-body">{renderMarkdownLite(msg.content)}</div>
                    <time className="ims-desk-msg-time" dateTime={msg.time.toISOString()}>
                      {formatTime(msg.time)}
                    </time>
                  </article>
                ))}

                {loading && (
                  <article className="ims-desk-msg ims-desk-msg--assistant ims-desk-msg--typing">
                    <div className="ims-desk-typing">
                      <span /><span /><span />
                    </div>
                  </article>
                )}
              </div>

              {showHero && (
                <div className="ims-desk-cards" role="group" aria-label="Quick actions">
                  {promptCards.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      className="ims-desk-card"
                      onClick={() => sendMessage(card.message)}
                      disabled={loading}
                    >
                      <span className="ims-desk-card-title">{card.title}</span>
                      <span className="ims-desk-card-desc">{card.desc}</span>
                    </button>
                  ))}
                </div>
              )}

              <form className="ims-desk-compose" onSubmit={handleSubmit}>
                <div className="ims-desk-compose-box">
                  <input
                    ref={inputRef}
                    type="text"
                    className="ims-desk-input"
                    placeholder="Message AI Chat…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    maxLength={500}
                    aria-label="Message"
                  />
                  <div className="ims-desk-compose-toolbar">
                    <div className="ims-desk-compose-pills">
                      <button
                        type="button"
                        className="ims-desk-pill"
                        onClick={() => sendMessage('Stock overview')}
                        disabled={loading}
                      >
                        Stock overview
                      </button>
                      <button
                        type="button"
                        className="ims-desk-pill"
                        onClick={() => sendMessage('Low stock items')}
                        disabled={loading}
                      >
                        Low stock
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="ims-desk-send"
                      disabled={!input.trim() || loading}
                      aria-label="Send"
                    >
                      <Icons.Send size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </form>
            </main>
          </div>
        </div>
      )}

      {!open && (
        <button
          type="button"
          className="ims-desk-fab"
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          title="AI Chat"
        >
          <span className="ims-desk-fab-orb" aria-hidden="true" />
          <Icons.SupportDesk size={22} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );

  return createPortal(deskUi, getDeskPortalRoot());
};

export default ChatAssistant;
