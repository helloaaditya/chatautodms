import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { Mail, ArrowRight } from 'lucide-react';
import { BRAND_NAME } from '../lib/constants';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage('Check your email for the magic link.');
  };

  return (
    <div className="auth-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap');
        .auth-page {
          --bg: #050508;
          overflow-x: hidden;
          --surface: #0f0f18;
          --border: rgba(255,255,255,0.07);
          --radius: 16px;
          --text: #f0f0f8;
          --text-muted: #6b6b80;
          --blue: #4f8ef7;
          --grad: linear-gradient(135deg, #e040fb 0%, #4f8ef7 50%, #22d3ee 100%);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .auth-page .auth-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 72px;
          min-height: 72px;
          padding: 0 clamp(1rem, 4vw, 4rem);
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem;
          background: rgba(5,5,8,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          box-sizing: border-box;
          overflow: hidden;
        }
        .auth-page .auth-nav .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 1.5rem; font-weight: 800;
          text-decoration: none; color: var(--text);
          letter-spacing: -0.02em;
          min-width: 0; flex: 1 1 auto; overflow: hidden; max-width: 100%;
        }
        .auth-page .auth-nav .nav-logo:hover { opacity: 0.95; }
        .auth-page .auth-nav .nav-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--grad);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .auth-page .auth-nav .nav-logo-text {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .auth-page .auth-nav .btn-ghost {
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 0.875rem; font-weight: 500;
          padding: 8px 16px; text-decoration: none;
          border-radius: var(--radius); flex-shrink: 0; white-space: nowrap;
        }
        .auth-page .auth-nav .btn-ghost:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .auth-page .auth-center {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 1.5rem 3rem;
        }
        .auth-page .auth-card {
          width: 100%;
          max-width: 28rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 2.5rem;
        }
        .auth-page .auth-card h1 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }
        .auth-page .auth-card .auth-sub {
          color: var(--text-muted);
          font-size: 0.9375rem;
          margin-bottom: 1.75rem;
        }
        .auth-page .auth-card label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 0.5rem;
        }
        .auth-page .auth-card input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 14px;
          color: var(--text);
          font-size: 1rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-page .auth-card input::placeholder {
          color: var(--text-muted);
        }
        .auth-page .auth-card input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(79,142,247,0.2);
        }
        .auth-page .auth-card .input-wrap {
          position: relative;
          margin-bottom: 1.25rem;
        }
        .auth-page .auth-card .input-wrap svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .auth-page .auth-card button[type="submit"] {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background: var(--grad);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 1rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: opacity 0.2s, transform 0.1s;
        }
        .auth-page .auth-card button[type="submit"]:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .auth-page .auth-card button[type="submit"]:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .auth-page .auth-msg {
          margin-top: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          text-align: center;
        }
        .auth-page .auth-msg.success { color: #34d399; }
        .auth-page .auth-msg.error { color: #f87171; }
        .auth-page .auth-footer {
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .auth-page .auth-footer a {
          color: var(--blue);
          text-decoration: none;
          font-weight: 600;
        }
        .auth-page .auth-footer a:hover { text-decoration: underline; }
        @media (max-width: 480px) {
          .auth-page .auth-nav { padding: 0 0.875rem; height: 56px; min-height: 56px; }
          .auth-page .auth-nav .nav-logo { font-size: 1.125rem; gap: 8px; }
          .auth-page .auth-nav .nav-logo-icon { width: 28px; height: 28px; font-size: 14px; }
          .auth-page .auth-center { padding: 5rem 1rem 2rem; align-items: flex-start; padding-top: 6rem; }
          .auth-page .auth-card { padding: 1.5rem; margin: 0; max-width: 100%; }
          .auth-page .auth-card h1 { font-size: 1.5rem; }
          .auth-page .auth-card .auth-sub { font-size: 0.875rem; margin-bottom: 1.25rem; }
        }
      `}</style>

      <header className="auth-nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          <span className="nav-logo-text">{BRAND_NAME}</span>
        </Link>
        <Link to="/" className="btn-ghost">← Back to Home</Link>
      </header>

      <div className="auth-center">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="auth-sub">Enter your email and we&apos;ll send you a magic link to sign in.</p>

          <form onSubmit={handleMagicLink}>
            <label htmlFor="auth-email">Email</label>
            <div className="input-wrap">
              <Mail size={20} />
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Magic Link'}
              <ArrowRight size={18} />
            </button>
            {message && (
              <p className={`auth-msg ${message.includes('Check your email') ? 'success' : 'error'}`}>
                {message}
              </p>
            )}
          </form>

          <p className="auth-footer">
            By continuing, you agree to {BRAND_NAME}&apos;s{' '}
            <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
