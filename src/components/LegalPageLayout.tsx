import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../lib/constants';

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, children }) => {
  return (
    <div className="legal-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800&display=swap');
        .legal-page {
          --bg: #050508;
          overflow-x: hidden;
          --bg2: #0a0a10;
          --surface: #0f0f18;
          --border: rgba(255,255,255,0.07);
          --text: #f0f0f8;
          --text-muted: #6b6b80;
          --pink: #e040fb;
          --blue: #4f8ef7;
          --cyan: #22d3ee;
          --grad: linear-gradient(135deg, #e040fb 0%, #4f8ef7 50%, #22d3ee 100%);
          --radius: 16px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .legal-page .legal-nav {
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
        .legal-page .legal-nav .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          font-size: 1.5rem; font-weight: 800;
          text-decoration: none; color: var(--text);
          letter-spacing: -0.02em;
          min-width: 0; flex: 1 1 auto; overflow: hidden; max-width: 100%;
        }
        .legal-page .legal-nav .nav-logo:hover { opacity: 0.95; }
        .legal-page .legal-nav .nav-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--grad);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .legal-page .legal-nav .nav-logo-text {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .legal-page .legal-nav .btn-ghost {
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 0.875rem; font-weight: 500;
          padding: 8px 16px; text-decoration: none;
          border-radius: var(--radius); flex-shrink: 0; white-space: nowrap;
        }
        .legal-page .legal-nav .btn-ghost:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .legal-page .legal-main {
          max-width: 42rem;
          margin: 0 auto;
          padding: 7rem 1.5rem 4rem;
        }
        .legal-page .legal-main h1 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .legal-page .legal-main .legal-updated {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 2.5rem;
        }
        .legal-page .legal-main section {
          margin-bottom: 2rem;
        }
        .legal-page .legal-main h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: var(--text);
        }
        .legal-page .legal-main p, .legal-page .legal-main li {
          color: var(--text-muted);
          line-height: 1.7;
          margin-bottom: 0.5rem;
        }
        .legal-page .legal-main ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .legal-page .legal-main a {
          color: var(--blue);
          text-decoration: none;
        }
        .legal-page .legal-main a:hover { text-decoration: underline; }
        .legal-page .legal-main .back-link {
          display: inline-block;
          margin-top: 2rem;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9375rem;
        }
        .legal-page .legal-main .back-link:hover { color: var(--text); }
        @media (max-width: 480px) {
          .legal-page .legal-nav { padding: 0 0.875rem; height: 56px; min-height: 56px; }
          .legal-page .legal-nav .nav-logo { font-size: 1.125rem; gap: 8px; }
          .legal-page .legal-nav .nav-logo-icon { width: 28px; height: 28px; font-size: 14px; }
          .legal-page .legal-main { padding: 5.5rem 1rem 3rem; }
          .legal-page .legal-main h1 { font-size: 1.75rem; }
          .legal-page .legal-main h2 { font-size: 1.125rem; }
          .legal-page .legal-main p, .legal-page .legal-main li { font-size: 0.9375rem; }
        }
      `}</style>
      <header className="legal-nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          <span className="nav-logo-text">{BRAND_NAME}</span>
        </Link>
        <Link to="/" className="btn-ghost">← Back to Home</Link>
      </header>
      <main className="legal-main">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: March 2025</p>
        {children}
        <Link to="/" className="back-link">← Back to Home</Link>
      </main>
    </div>
  );
};
