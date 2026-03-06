import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME, BRAND_NAME, BUSINESS_NAME, CONTACT_EMAIL, LOGO_URL } from '../lib/constants';
import { OrganizationWebSiteSchema, SoftwareApplicationSchema, FaqSchema } from '../components/SeoHead';

// Animated counter
function useCounter(end: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

// Floating particles background
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            opacity: 0.3 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  );
}

// Stat card with animated counter
function StatCard({ value, suffix, label, delay, inView }: { value: number; suffix?: string; label: string; delay: number; inView: boolean }) {
  const count = useCounter(value, 2000, inView);
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}s` }}>
      <div className="stat-value">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [statsInView, setStatsInView] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const statsRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setStatsInView(true);
    }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % 6), 3000);
    return () => clearInterval(t);
  }, []);

  const features = [
    { icon: "💬", title: "Auto Reply DMs", desc: "Instant, context-aware responses to every message 24/7. Set keywords, craft replies, and let the engine do the rest.", accent: "#3b82f6" },
    { icon: "🎯", title: "Comment → DM", desc: "Turn every comment into a private conversation. Auto-reply publicly and slide into their DMs simultaneously.", accent: "#ec4899" },
    { icon: "⚡", title: "Flow Builder", desc: "Visual automation flows with zero code. Connect triggers, conditions, and actions in minutes.", accent: "#f59e0b" },
    { icon: "🔒", title: "Lead Capture", desc: "Every conversation becomes a lead. Capture, tag, and manage prospects from a unified dashboard.", accent: "#10b981" },
    { icon: "📊", title: "Deep Analytics", desc: "Track opens, replies, conversions, and revenue attribution. Know what's working and double down.", accent: "#8b5cf6" },
    { icon: "📸", title: "Story Replies", desc: "Auto-engage when someone reacts to your Story. Warm leads while they're still watching.", accent: "#f43f5e" },
  ];

  const plans = [
    {
      name: "Starter",
      price: "₹0",
      period: "",
      tag: "Free forever",
      desc: "For creators just getting started",
      features: ["Comment automations", "DM auto-replies", "Basic analytics", "1 Instagram account"],
      cta: "Start for free",
      highlight: false,
    },
    {
      name: "Premium",
      price: "₹999",
      period: "/mo",
      tag: "Most popular",
      desc: "For brands ready to scale",
      features: ["Everything in Starter", "Follow CTA flows", "Lead capture & export", "Story reply automation", "Priority support"],
      cta: "Start 7-day trial",
      highlight: true,
    },
    {
      name: "Ultra",
      price: "₹999",
      period: "/mo",
      tag: "+ ₹599 setup",
      desc: "For teams who want hands-on results",
      features: ["Everything in Premium", "1:1 onboarding session", "Custom flow setup", "Dedicated account manager", "White-glove support"],
      cta: "Book onboarding",
      highlight: false,
    },
  ];

  const faqs = [
    { question: 'What is Grow Creation?', answer: 'Grow Creation is an Instagram automation platform by V2 MARKETING. It helps creators and brands auto-reply to comments, turn comments into private DMs, capture leads, and run automation flows—all from one dashboard. It works only with Instagram (no Facebook).' },
    { question: 'Is Grow Creation free?', answer: 'Yes. The Starter plan is free forever and includes comment automations, DM auto-replies, basic analytics, and 1 Instagram account. Premium (₹999/month) adds Follow CTA flows, lead capture, and story reply automation. Ultra adds 1:1 onboarding and custom setup.' },
    { question: 'How does comment-to-DM work?', answer: 'When someone comments on your post (or a chosen post), Grow Creation can automatically send them a direct message. You set the trigger (e.g. keyword or any comment) and the opening message. Optionally, Premium users can ask them to follow before sending the main content.' },
    { question: 'Do you store my Instagram credentials or password?', answer: 'No. We never see or store your Instagram password. You connect via Meta’s official login (OAuth). We only receive and store the access tokens that Meta gives us, so we can send messages and read comments on your behalf. You can disconnect your account anytime from your dashboard.' },
    { question: 'Do you sell or share my data?', answer: 'No. We do not sell or share your personal data or Instagram data with third parties for marketing. We use your data only to run your automations and improve our service. See our Privacy Policy for full details.' },
    { question: 'Is my data secure?', answer: 'Yes. We use industry-standard encryption (HTTPS, secure databases) and follow best practices to keep your account and data safe. Access tokens are stored securely and our systems are built to comply with common security requirements.' },
    { question: 'Can I connect multiple Instagram accounts?', answer: 'Yes. You can connect up to 10 Instagram accounts to your Grow Creation account. You can switch between accounts anytime from your dashboard.' },
    { question: 'Where can I contact Grow Creation?', answer: `You can reach us at ${CONTACT_EMAIL}. For support, billing, or partnership inquiries, email us or use the contact link in the footer.` },
  ];

  return (
    <div className="landing-root font-landing">
      <OrganizationWebSiteSchema />
      <SoftwareApplicationSchema />
      <FaqSchema faqs={faqs} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #f5f6fa;
          --bg2: #eef1f7;
          --surface: #ffffff;
          --surface2: #f8f9fc;
          --border: rgba(0,0,0,0.08);
          --border-bright: rgba(0,0,0,0.14);
          --text: #0f172a;
          --text-muted: #64748b;
          --text-dim: #94a3b8;
          --pink: #e040fb;
          --blue: #4f8ef7;
          --cyan: #22d3ee;
          --amber: #fbbf24;
          --green: #34d399;
          --grad: linear-gradient(135deg, #e040fb 0%, #4f8ef7 50%, #22d3ee 100%);
          --grad-text: linear-gradient(135deg, #e040fb, #818cf8, #4f8ef7);
          --glow-pink: rgba(224,64,251,0.25);
          --glow-blue: rgba(79,142,247,0.25);
          --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
          --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
          --radius: 16px;
          --radius-lg: 24px;
          --radius-xl: 32px;
        }

        .landing-root {
          font-family: var(--font-body);
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .landing-root * {
          font-family: inherit;
        }
        .landing-root .nav-logo,
        .landing-root .hero-title,
        .landing-root .section-title,
        .landing-root .footer-col-title,
        .landing-root .stat-value,
        .landing-root .plan-name {
          font-family: var(--font-display);
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 clamp(1rem, 4vw, 4rem);
          height: 72px;
          min-height: 72px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem;
          transition: all 0.4s ease;
          box-sizing: border-box;
          overflow: hidden;
        }
        .nav.scrolled {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-display);
          font-size: 1.5rem; font-weight: 800;
          text-decoration: none; color: var(--text);
          letter-spacing: -0.02em;
          min-width: 0;
          flex-shrink: 1;
        }
        .nav-logo span:last-child, .nav-logo .nav-logo-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--grad);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .nav-links {
          display: flex; align-items: center; gap: 2rem;
          list-style: none;
        }
        .nav-links a {
          color: var(--text-muted); text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          transition: color 0.2s;
          letter-spacing: 0.01em;
        }
        .nav-links a:hover { color: var(--text); }
        .nav-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .btn-ghost {
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-family: var(--font-body);
          font-size: 0.875rem; font-weight: 500; padding: 8px 16px;
          text-decoration: none; transition: color 0.2s; border-radius: var(--radius);
        }
        .btn-ghost:hover { color: var(--text); background: rgba(0,0,0,0.05); }
        .btn-primary {
          background: var(--grad);
          border: none; cursor: pointer;
          color: white; font-family: var(--font-body);
          font-size: 0.875rem; font-weight: 600;
          padding: 10px 22px; border-radius: 100px;
          text-decoration: none; transition: all 0.2s;
          position: relative; overflow: hidden;
          box-shadow: 0 0 24px var(--glow-pink);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 32px var(--glow-pink); }
        .btn-primary:active { transform: translateY(0); }

        .nav-mobile-toggle {
          display: none;
          background: none; border: none; cursor: pointer;
          padding: 10px; color: var(--text); flex-shrink: 0;
          align-items: center; justify-content: center;
          border-radius: 10px;
        }
        .nav-mobile-toggle:hover { background: rgba(0,0,0,0.06); }
        .nav-mobile-toggle:focus { outline: none; }

        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-actions { display: none !important; }
          .nav-mobile-toggle { display: flex !important; }
        }
        @media (max-width: 480px) {
          .nav { padding: 0 0.875rem; height: 56px; min-height: 56px; }
          .nav-logo { font-size: 1.125rem; gap: 8px; }
          .nav-logo-icon { width: 28px; height: 28px; font-size: 14px; }
        }

        .nav-drawer {
          display: none;
          position: fixed; top: 72px; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.98); backdrop-filter: blur(20px);
          z-index: 99; padding: 1.5rem; overflow-y: auto;
          flex-direction: column; gap: 0;
          -webkit-overflow-scrolling: touch;
        }
        .nav-drawer.open { display: flex; }
        .nav-drawer a {
          display: block; padding: 14px 0;
          color: var(--text-muted); text-decoration: none;
          font-size: 1.125rem; font-weight: 500;
          border-bottom: 1px solid var(--border);
        }
        .nav-drawer a:hover { color: var(--text); }
        .nav-drawer .btn-ghost, .nav-drawer .btn-primary {
          margin-top: 1rem; text-align: center; justify-content: center;
          width: 100%; padding: 12px 16px;
        }
        @media (max-width: 480px) {
          .nav-drawer { top: 56px; }
        }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center;
          padding: 120px clamp(1.5rem, 5vw, 4rem) 80px;
          position: relative;
          overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 60% 40%, rgba(224,64,251,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 30% 70%, rgba(79,142,247,0.1) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(34,211,238,0.08) 0%, transparent 50%);
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        }
        .hero-content {
          max-width: 1200px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center; position: relative; z-index: 1;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px 6px 8px;
          background: rgba(224,64,251,0.12);
          border: 1px solid rgba(224,64,251,0.3);
          border-radius: 100px;
          font-size: 0.8rem; font-weight: 600; color: #a855f7;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s ease both;
        }
        .hero-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--pink); animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(2.8rem, 5.5vw, 5rem);
          font-weight: 800; line-height: 1.05;
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
          animation: fadeUp 0.6s 0.1s ease both;
        }
        .hero-title .line2 {
          display: block;
          background: var(--grad-text);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 1.125rem; color: var(--text-muted); line-height: 1.7;
          max-width: 480px; margin-bottom: 2.5rem;
          font-weight: 300;
          animation: fadeUp 0.6s 0.2s ease both;
        }
        .hero-actions {
          display: flex; gap: 12px; flex-wrap: wrap;
          animation: fadeUp 0.6s 0.3s ease both;
          margin-bottom: 3rem;
        }
        .btn-hero {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 100px;
          font-family: var(--font-body); font-size: 1rem; font-weight: 600;
          text-decoration: none; cursor: pointer; border: none;
          transition: all 0.25s;
        }
        .btn-hero-primary {
          background: var(--grad);
          color: white;
          box-shadow: 0 8px 40px rgba(224,64,251,0.3);
        }
        .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 50px rgba(224,64,251,0.4); }
        .btn-hero-secondary {
          background: rgba(0,0,0,0.04);
          border: 1px solid var(--border-bright);
          color: var(--text);
        }
        .btn-hero-secondary:hover { background: rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.2); }
        .hero-social-proof {
          display: flex; align-items: center; gap: 12px;
          animation: fadeUp 0.6s 0.4s ease both;
        }
        .avatars { display: flex; }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          border: 2px solid var(--surface);
          background: linear-gradient(135deg, #e040fb, #4f8ef7);
          margin-left: -8px;
          font-size: 12px; display: flex; align-items: center; justify-content: center;
        }
        .avatar:first-child { margin-left: 0; }
        .social-text { font-size: 0.85rem; color: var(--text-muted); font-weight: 400; }
        .social-text strong { color: var(--text); font-weight: 600; }

        /* Hero visual */
        .hero-visual {
          position: relative;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .hero-card {
          background: var(--surface);
          border: 1px solid var(--border-bright);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.12), 0 0 40px rgba(224,64,251,0.08);
          position: relative;
        }
        .hero-card-header {
          padding: 14px 18px;
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid var(--border);
          background: var(--surface2);
        }
        .traffic-lights { display: flex; gap: 6px; }
        .tl { width: 10px; height: 10px; border-radius: 50%; }
        .tl-r { background: #ff5f57; }
        .tl-y { background: #febc2e; }
        .tl-g { background: #28c840; }
        .card-title-bar {
          flex: 1; background: rgba(0,0,0,0.05); border-radius: 6px;
          height: 24px; display: flex; align-items: center; padding: 0 10px;
          font-size: 0.7rem; color: var(--text-muted);
        }
        .dashboard-preview {
          padding: 16px; display: flex; flex-direction: column; gap: 12px;
        }
        .dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .dash-stat {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px;
        }
        .dash-stat-val {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 700; margin-bottom: 2px;
        }
        .dash-stat-lbl { font-size: 0.7rem; color: var(--text-muted); }
        .dash-chart {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px; height: 90px;
          display: flex; align-items: flex-end; gap: 6px; overflow: hidden;
        }
        .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .bar {
          width: 100%; border-radius: 4px 4px 0 0;
          background: linear-gradient(180deg, var(--pink) 0%, var(--blue) 100%);
          opacity: 0.7;
        }
        .dash-feed { display: flex; flex-direction: column; gap: 6px; }
        .feed-row {
          display: flex; align-items: center; gap: 10px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 8px 12px;
          animation: slideIn 0.4s ease both;
        }
        .feed-avatar {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, var(--pink), var(--blue));
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
        }
        .feed-text { flex: 1; }
        .feed-name { font-size: 0.72rem; font-weight: 600; color: var(--text); }
        .feed-msg { font-size: 0.68rem; color: var(--text-muted); margin-top: 1px; }
        .feed-badge {
          font-size: 0.6rem; font-weight: 700; padding: 2px 7px;
          border-radius: 100px; flex-shrink: 0;
        }
        .badge-sent { background: rgba(52,211,153,0.15); color: var(--green); }
        .badge-new { background: rgba(224,64,251,0.15); color: var(--pink); }
        .floating-notif {
          position: absolute; right: -20px; top: 40%;
          background: var(--surface);
          border: 1px solid var(--border-bright);
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: flex; align-items: center; gap: 8px;
          animation: floatNotif 3s ease-in-out infinite;
          white-space: nowrap;
        }
        .notif-icon { font-size: 18px; }
        .notif-text { font-size: 0.72rem; }
        .notif-text strong { display: block; color: var(--text); font-weight: 600; }
        .notif-text span { color: var(--text-muted); }
        @keyframes floatNotif {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .floating-notif2 {
          position: absolute; left: -24px; bottom: 15%;
          background: var(--surface);
          border: 1px solid rgba(52,211,153,0.35);
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: flex; align-items: center; gap: 8px;
          animation: floatNotif 3s 1.5s ease-in-out infinite;
          white-space: nowrap;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 900px) {
          .hero-content { grid-template-columns: 1fr; }
          .hero-visual { order: -1; }
          .floating-notif { right: 0; }
          .floating-notif2 { left: 0; }
        }
        @media (max-width: 480px) {
          .hero { padding: 100px 1rem 60px; }
          .hero-title { font-size: clamp(2rem, 8vw, 2.75rem); }
          .hero-sub { font-size: 1rem; }
          .hero-actions { flex-direction: column; gap: 10px; margin-bottom: 2rem; }
          .btn-hero { width: 100%; justify-content: center; padding: 12px 20px; }
          .hero-social-proof { flex-wrap: wrap; }
          .hero-card { max-width: 100%; }
          .card-title-bar { font-size: 0.6rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        }

        /* ── STATS ── */
        .stats-section {
          padding: 80px clamp(1.5rem, 5vw, 4rem);
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .stats-inner {
          max-width: 1000px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 2px; background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg); overflow: hidden;
        }
        .stat-card {
          background: var(--surface);
          padding: 2.5rem 2rem;
          text-align: center;
          position: relative; overflow: hidden;
          transition: background 0.3s;
          animation: fadeUp 0.6s ease both;
        }
        .stat-card:hover { background: var(--surface2); }
        .stat-card::after {
          content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 40%; height: 2px;
          background: var(--grad);
          border-radius: 2px;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 2.8rem; font-weight: 800;
          background: var(--grad-text);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1; margin-bottom: 0.5rem;
        }
        .stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 400; }
        @media (max-width: 600px) {
          .stats-inner { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-section { padding: 50px 1rem; }
          .stat-card { padding: 1.5rem 1rem; }
          .stat-value { font-size: 2rem; }
        }

        /* ── HOW IT WORKS ── */
        .section {
          padding: 100px clamp(1.5rem, 5vw, 4rem);
          max-width: 1200px; margin: 0 auto;
        }
        .section-label {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 4px 14px; border-radius: 100px;
          background: rgba(79,142,247,0.1);
          border: 1px solid rgba(79,142,247,0.2);
          font-size: 0.75rem; font-weight: 700; color: var(--blue);
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 1rem;
        }
        .section-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3.25rem);
          font-weight: 800; letter-spacing: -0.03em;
          line-height: 1.1; margin-bottom: 1rem;
        }
        .section-sub {
          font-size: 1.1rem; color: var(--text-muted);
          max-width: 560px; line-height: 1.7; font-weight: 300;
        }

        /* Steps */
        .steps-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: var(--border);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden; margin-top: 4rem;
        }
        .step-card {
          background: var(--surface);
          padding: 2.5rem 2rem;
          position: relative; overflow: hidden;
          transition: background 0.3s;
        }
        .step-card:hover { background: var(--surface2); }
        .step-number {
          font-family: var(--font-display);
          font-size: 5rem; font-weight: 800;
          position: absolute; top: -0.5rem; right: 1.5rem;
          opacity: 0.05; line-height: 1;
          background: var(--grad-text);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .step-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: var(--surface2); border: 1px solid var(--border-bright);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 1.5rem;
        }
        .step-title {
          font-family: var(--font-display);
          font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }
        .step-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.65; }
        @media (max-width: 768px) {
          .steps-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .section { padding: 60px 1rem; }
          .section-title { font-size: clamp(1.5rem, 6vw, 2rem); }
        }

        /* ── FEATURES ── */
        .features-section {
          padding: 100px clamp(1.5rem, 5vw, 4rem);
          background: var(--surface);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .features-inner { max-width: 1200px; margin: 0 auto; }
        .features-header { margin-bottom: 4rem; }
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .feature-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          transition: all 0.3s;
          cursor: pointer; position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: var(--grad); opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover, .feature-card.active {
          border-color: var(--border-bright);
          background: var(--surface);
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .feature-card:hover::before, .feature-card.active::before { opacity: 1; }
        .feature-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 1.25rem;
          border: 1px solid var(--border);
          background: var(--surface2);
        }
        .feature-title {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 700; margin-bottom: 0.6rem;
          letter-spacing: -0.02em;
        }
        .feature-desc { font-size: 0.875rem; color: var(--text-muted); line-height: 1.65; }
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .features-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .features-section { padding: 60px 1rem; }
          .features-header { margin-bottom: 2.5rem; }
        }

        /* ── MARQUEE ── */
        .marquee-section {
          padding: 60px 0; overflow: hidden;
          border-top: 1px solid var(--border);
        }
        .marquee-track {
          display: flex; gap: 2rem;
          animation: marquee 20s linear infinite;
          width: max-content;
        }
        .marquee-track.reverse { animation-direction: reverse; animation-duration: 25s; }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-item {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          font-size: 0.85rem; font-weight: 500; color: var(--text-muted);
          white-space: nowrap;
        }
        .marquee-item span { color: var(--text); }

        /* ── PRICING ── */
        .pricing-section {
          padding: 100px clamp(1.5rem, 5vw, 4rem);
        }
        .pricing-inner { max-width: 1100px; margin: 0 auto; }
        .pricing-header { text-align: center; margin-bottom: 4rem; }
        .pricing-header .section-sub { margin: 0 auto; }
        .pricing-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; align-items: start;
        }
        .plan-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          position: relative; overflow: hidden;
          transition: all 0.3s;
        }
        .plan-card:hover {
          border-color: var(--border-bright);
          transform: translateY(-4px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.12);
        }
        .plan-card.featured {
          border-color: rgba(224,64,251,0.35);
          background: linear-gradient(160deg, rgba(224,64,251,0.08) 0%, var(--surface) 60%);
          box-shadow: 0 0 40px rgba(224,64,251,0.08);
        }
        .plan-card.featured:hover {
          box-shadow: 0 24px 64px rgba(224,64,251,0.15);
        }
        .plan-tag {
          display: inline-block; padding: 3px 10px; border-radius: 100px;
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 1.5rem;
        }
        .tag-free { background: rgba(0,0,0,0.06); color: var(--text-muted); }
        .tag-popular { background: var(--grad); color: white; }
        .tag-ultra { background: rgba(0,0,0,0.06); color: var(--text-muted); }
        .plan-name {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 800; margin-bottom: 0.25rem;
          letter-spacing: -0.02em;
        }
        .plan-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; }
        .plan-price { margin-bottom: 1.75rem; }
        .plan-price-main {
          font-family: var(--font-display);
          font-size: 3rem; font-weight: 800;
          letter-spacing: -0.03em; line-height: 1;
        }
        .plan-price-main.grad {
          background: var(--grad-text);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .plan-price-period { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
        .plan-price-note { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
        .plan-divider {
          height: 1px; background: var(--border); margin: 1.5rem 0;
        }
        .plan-features { list-style: none; margin-bottom: 1.75rem; display: flex; flex-direction: column; gap: 10px; }
        .plan-feature {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 0.875rem; color: var(--text);
        }
        .check-icon {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(52,211,153,0.15);
          border: 1px solid rgba(52,211,153,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
          font-size: 10px; color: var(--green);
        }
        .btn-plan {
          display: block; width: 100%; text-align: center;
          padding: 14px; border-radius: var(--radius); font-family: var(--font-body);
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          text-decoration: none; transition: all 0.25s;
        }
        .btn-plan-grad {
          background: var(--grad); color: white;
          box-shadow: 0 8px 30px rgba(224,64,251,0.25);
        }
        .btn-plan-grad:hover { transform: translateY(-1px); box-shadow: 0 12px 40px rgba(224,64,251,0.35); }
        .btn-plan-outline {
          background: transparent;
          border: 1px solid var(--border-bright);
          color: var(--text);
        }
        .btn-plan-outline:hover { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.2); }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .pricing-section { padding: 60px 1rem; }
          .plan-card { padding: 1.5rem; }
        }

        /* ── CTA ── */
        .cta-section {
          padding: 80px clamp(1.5rem, 5vw, 4rem);
          position: relative; overflow: hidden;
        }
        .cta-inner {
          max-width: 900px; margin: 0 auto;
          text-align: center; position: relative;
        }
        .cta-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 5rem 3rem;
          position: relative; overflow: hidden;
        }
        .cta-glow {
          position: absolute;
          width: 400px; height: 400px; border-radius: 50%;
          filter: blur(80px); opacity: 0.15;
          pointer-events: none;
        }
        .cta-glow-1 { background: var(--pink); top: -100px; left: -100px; }
        .cta-glow-2 { background: var(--blue); bottom: -100px; right: -100px; }
        .cta-eyebrow {
          display: inline-block; font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--pink); margin-bottom: 1.25rem;
        }
        .cta-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4.5vw, 3.75rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
          margin-bottom: 1.25rem;
        }
        .cta-sub {
          font-size: 1.1rem; color: var(--text-muted);
          margin-bottom: 2.5rem; font-weight: 300; line-height: 1.7;
        }
        .cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        @media (max-width: 480px) {
          .cta-section { padding: 60px 1rem; }
          .cta-card { padding: 2.5rem 1.5rem; }
          .cta-title { font-size: clamp(1.5rem, 6vw, 2.25rem); }
          .cta-sub { font-size: 1rem; margin-bottom: 1.5rem; }
          .cta-actions { flex-direction: column; }
          .cta-actions .btn-hero { width: 100%; justify-content: center; }
        }

        /* ── FOOTER ── */
        .footer {
          border-top: 1px solid var(--border);
          padding: 60px clamp(1.5rem, 5vw, 4rem) 40px;
          background: var(--bg);
        }
        .footer-inner { max-width: 1200px; margin: 0 auto; }
        .footer-top {
          display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 3rem; margin-bottom: 3rem;
        }
        .footer-brand-name {
          font-family: var(--font-display);
          font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;
          margin-bottom: 0.75rem; display: flex; align-items: center; gap: 8px;
        }
        .footer-brand-desc { font-size: 0.875rem; color: var(--text-muted); line-height: 1.65; max-width: 280px; }
        .footer-col-title {
          font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 1rem;
        }
        .footer-links { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .footer-links a {
          font-size: 0.875rem; color: var(--text-muted); text-decoration: none;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--text); }
        .footer-bottom {
          border-top: 1px solid var(--border); padding-top: 2rem;
          display: flex; justify-content: space-between; align-items: center;
          gap: 1rem; flex-wrap: wrap;
        }
        .footer-copy { font-size: 0.8rem; color: var(--text-dim); }
        .footer-legal { display: flex; gap: 1.5rem; }
        .footer-legal a {
          font-size: 0.8rem; color: var(--text-dim); text-decoration: none;
          transition: color 0.2s;
        }
        .footer-legal a:hover { color: var(--text-muted); }
        @media (max-width: 768px) {
          .footer-top { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .footer-top { grid-template-columns: 1fr; gap: 2rem; }
          .footer { padding: 40px 1rem 24px; }
          .footer-brand-desc { max-width: 100%; }
          .footer-bottom { flex-direction: column; align-items: flex-start; padding-top: 1.5rem; gap: 0.75rem; }
          .footer-legal { flex-wrap: wrap; gap: 0.75rem; }
        }

        /* ── FAQ ── */
        .faq-section {
          padding: 80px clamp(1.5rem, 5vw, 4rem);
          background: var(--bg);
          border-top: 1px solid var(--border);
        }
        .faq-inner { max-width: 720px; margin: 0 auto; }
        .faq-section .section-label { margin-bottom: 0.5rem; }
        .faq-section .section-title { margin-bottom: 2rem; }
        .faq-list { display: flex; flex-direction: column; gap: 0; }
        .faq-item {
          border-bottom: 1px solid var(--border);
          transition: background 0.2s;
        }
        .faq-item:first-child { border-top: 1px solid var(--border); }
        .faq-q {
          width: 100%;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 0;
          background: none; border: none;
          font-family: var(--font-body);
          font-size: 1rem; font-weight: 600; color: var(--text);
          text-align: left; cursor: pointer;
          gap: 1rem;
        }
        .faq-q:hover { color: var(--pink); }
        .faq-q span:first-child { flex: 1; }
        .faq-icon { flex-shrink: 0; transition: transform 0.2s; color: var(--text-muted); }
        .faq-item.open .faq-icon { transform: rotate(45deg); color: var(--pink); }
        .faq-a {
          display: none;
          padding: 0 0 1.25rem 0;
          font-size: 0.9375rem; color: var(--text-muted);
          line-height: 1.7;
        }
        .faq-item.open .faq-a { display: block; }
        .faq-a-inner { padding-right: 2rem; }
        @media (max-width: 480px) {
          .faq-section { padding: 60px 1rem; }
          .faq-q { font-size: 0.9375rem; padding: 1rem 0; }
          .faq-a { padding-bottom: 1rem; }
        }

        /* ── PARTICLES ── */
        .particle {
          position: absolute; border-radius: 50%;
          background: var(--pink);
          animation: floatParticle var(--dur, 8s) var(--delay, 0s) ease-in-out infinite;
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-30px) scale(1.2); opacity: 0.6; }
        }

        /* scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 3px; }

        /* selection */
        ::selection { background: rgba(224,64,251,0.3); color: white; }

        .grad-text {
          background: var(--grad-text);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          <span className="nav-logo-text">{BRAND_NAME}</span>
        </Link>
        <ul className="nav-links">
          <li><a href="#product">Product</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="nav-actions">
          <Link to="/login" className="btn-ghost">Login</Link>
          <Link to="/login" className="btn-primary">Get Started Free →</Link>
        </div>
        <button type="button" className="nav-mobile-toggle" aria-label="Menu" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          )}
        </button>
      </nav>
      <div className={`nav-drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
        <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        <Link to="/login" className="btn-ghost" onClick={() => setMenuOpen(false)}>Login</Link>
        <Link to="/login" className="btn-primary" onClick={() => setMenuOpen(false)}>Get Started Free →</Link>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <ParticleField />
        <div className="hero-content">
          <div>
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              Instagram Automation Platform
            </div>
            <h1 className="hero-title">
              Turn comments<br />
              <span className="line2">into customers.</span>
            </h1>
            <p className="hero-sub">
              Auto-reply DMs, convert every comment into a conversation, and grow your Instagram on autopilot — 24/7, zero manual effort.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn-hero btn-hero-primary">
                Start for free <span>→</span>
              </Link>
              <a href="#product" className="btn-hero btn-hero-secondary">
                <span>▶</span> See it in action
              </a>
            </div>
            <div className="hero-social-proof">
              <div className="avatars">
                {['🧑', '👩', '🧑‍💼', '👩‍💻'].map((e, i) => (
                  <div key={i} className="avatar">{e}</div>
                ))}
              </div>
              <p className="social-text">
                <strong>200+ creators</strong> growing on autopilot
              </p>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-header">
                <div className="traffic-lights">
                  <div className="tl tl-r" />
                  <div className="tl tl-y" />
                  <div className="tl tl-g" />
                </div>
                <div className="card-title-bar">https://growcreation.in — Dashboard</div>
              </div>
              <div className="dashboard-preview">
                <div className="dash-stats">
                  <div className="dash-stat">
                    <div className="dash-stat-val" style={{color:'#e040fb'}}>1000+</div>
                    <div className="dash-stat-lbl">DMs sent</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-val" style={{color:'#4f8ef7'}}>99%</div>
                    <div className="dash-stat-lbl">Reply rate</div>
                  </div>
                  <div className="dash-stat">
                    <div className="dash-stat-val" style={{color:'#34d399'}}>₹12k</div>
                    <div className="dash-stat-lbl">Leads value</div>
                  </div>
                </div>
                <div className="dash-chart">
                  {[30,50,40,70,55,80,65,90,75,100,85,95].map((h, i) => (
                    <div key={i} className="bar-wrap">
                      <div className="bar" style={{height:`${h}%`, animationDelay:`${i*0.1}s`}} />
                    </div>
                  ))}
                </div>
                <div className="dash-feed">
                  {[
                    {name:'@priya.sharma', msg:'Just commented on your reel 🔥', badge:'Replied', cls:'badge-sent', emoji:'🇮🇳'},
                    {name:'@techfounder', msg:'Story reply received', badge:'New lead', cls:'badge-new', emoji:'💼'},
                    {name:'@fitlife.raj', msg:'Commented "where to buy?"', badge:'Replied', cls:'badge-sent', emoji:'💪'},
                  ].map((row, i) => (
                    <div key={i} className="feed-row" style={{animationDelay:`${i*0.15}s`}}>
                      <div className="feed-avatar">{row.emoji}</div>
                      <div className="feed-text">
                        <div className="feed-name">{row.name}</div>
                        <div className="feed-msg">{row.msg}</div>
                      </div>
                      <div className={`feed-badge ${row.cls}`}>{row.badge}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="floating-notif">
              <div className="notif-icon">⚡</div>
              <div className="notif-text">
                <strong>Auto-reply triggered</strong>
                <span>0.3s response time</span>
              </div>
            </div>
            <div className="floating-notif2">
              <div className="notif-icon">🎯</div>
              <div className="notif-text">
                <strong>New lead captured</strong>
                <span>Comment → DM flow</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-section" ref={statsRef}>
        <div className="stats-inner">
          <StatCard value={400} suffix="+" label="Active creators" delay={0} inView={statsInView} />
          <StatCard value={1000} suffix="+" label="DMs automated" delay={0.1} inView={statsInView} />
          <StatCard value={99} suffix="%" label="Avg. reply rate" delay={0.2} inView={statsInView} />
          <StatCard value={75} suffix="x" label="Faster than manual" delay={0.3} inView={statsInView} />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="product">
        <div className="section">
          <div className="section-label">How it works</div>
          <h2 className="section-title">
            Set up once.<br />
            <span className="grad-text">Grow forever.</span>
          </h2>
          <p className="section-sub">Three steps and your Instagram is running on autopilot — replies, leads, and conversions happening while you sleep.</p>
          <div className="steps-grid">
            {[
              { n:'01', icon:'🔗', title:'Connect Instagram', desc:'Link your Instagram Business or Creator account securely via the official Meta API. One-click setup, no passwords shared.' },
              { n:'02', icon:'⚙️', title:'Build your flows', desc:'Use our intuitive flow builder to set keyword triggers, craft reply templates, and define Comment→DM automations in minutes.' },
              { n:'03', icon:'📈', title:'Watch it grow', desc:'Go live and watch replies fire automatically, leads get captured, and your analytics dashboard light up in real-time.' },
            ].map((s) => (
              <div key={s.n} className="step-card">
                <div className="step-number">{s.n}</div>
                <div className="step-icon">{s.icon}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MARQUEE */}
      <div className="marquee-section">
        <div className="marquee-track">
          {[...Array(2)].map((_, rep) =>
            ['Comment Automation', 'DM Flows', 'Story Replies', 'Lead Capture', 'Keyword Triggers', 'Analytics Dashboard', 'Follow CTA', '24/7 Autopilot', 'Real-time Stats', 'Instagram API'].map((item, i) => (
              <div key={`${rep}-${i}`} className="marquee-item">
                <span>✦</span> <span>{item}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="features-section">
        <div className="features-inner">
          <div className="features-header">
            <div className="section-label">Features</div>
            <h2 className="section-title">
              Every tool you need<br />
              <span className="grad-text">to dominate Instagram.</span>
            </h2>
            <p className="section-sub" style={{marginTop:'0.75rem'}}>From comment-to-DM flows to deep analytics — everything built for Instagram growth at scale.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`feature-card${activeFeature === i ? ' active' : ''}`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className="feature-icon-wrap" style={{background:`${f.accent}15`, borderColor:`${f.accent}30`}}>
                  {f.icon}
                </div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-inner">
          <div className="pricing-header">
            <div className="section-label" style={{display:'inline-flex'}}>Pricing</div>
            <h2 className="section-title" style={{marginTop:'0.75rem'}}>
              Transparent. Flexible.<br />
              <span className="grad-text">Built to scale with you.</span>
            </h2>
            <p className="section-sub" style={{marginTop:'0.75rem'}}>Start completely free. Upgrade when you're ready to unlock more power.</p>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.name} className={`plan-card${plan.highlight ? ' featured' : ''}`}>
                <div className={`plan-tag ${plan.highlight ? 'tag-popular' : plan.name === 'Ultra' ? 'tag-ultra' : 'tag-free'}`}>
                  {plan.tag}
                </div>
                <div className="plan-name">{plan.name}</div>
                <p className="plan-desc">{plan.desc}</p>
                <div className="plan-price">
                  <span className={`plan-price-main${plan.highlight ? ' grad' : ''}`}>{plan.price}</span>
                  <span className="plan-price-period">{plan.period}</span>
                  {plan.name === 'Ultra' && <div className="plan-price-note">+ ₹599 one-time setup</div>}
                </div>
                <div className="plan-divider" />
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f} className="plan-feature">
                      <div className="check-icon">✓</div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`btn-plan ${plan.highlight ? 'btn-plan-grad' : 'btn-plan-outline'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq-section" aria-labelledby="faq-title">
        <div className="faq-inner">
          <div className="section-label">FAQ</div>
          <h2 id="faq-title" className="section-title">Frequently asked questions</h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaqId === i ? 'open' : ''}`}>
                <button type="button" className="faq-q" onClick={() => setOpenFaqId(openFaqId === i ? null : i)} aria-expanded={openFaqId === i}>
                  <span>{faq.question}</span>
                  <span className="faq-icon" aria-hidden>+</span>
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{faq.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-card">
            <div className="cta-glow cta-glow-1" />
            <div className="cta-glow cta-glow-2" />
            <div style={{position:'relative', zIndex:1}}>
              <div className="cta-eyebrow">Ready when you are</div>
              <h2 className="cta-title">
                Your Instagram,<br />
                <span className="grad-text">on autopilot.</span>
              </h2>
              <p className="cta-sub">
                Join thousands of creators and brands who've turned {BRAND_NAME} into their #1 growth engine. Free to start, powerful at scale.
              </p>
              <div className="cta-actions">
<Link to="/login" className="btn-hero btn-hero-primary">
                Start for free →
                </Link>
                <a href={`mailto:${CONTACT_EMAIL}`} className="btn-hero btn-hero-secondary">
                  Talk to us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-brand-name">
                <div className="nav-logo-icon" style={{width:28,height:28,fontSize:14}}>⚡</div>
                {BRAND_NAME}
              </div>
              <p className="footer-brand-desc">
                Instagram automation for comments, DMs, and lead capture. Built for creators who want to grow without burning out.
              </p>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/login">Dashboard</a></li>
                <li><a href="/login">Get started</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Company</div>
              <ul className="footer-links">
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
                <li><a href="#">Careers</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Legal</div>
              <ul className="footer-links">
                <li><Link to="/privacy">Privacy Policy</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} {BRAND_NAME} ({BUSINESS_NAME}). All rights reserved.</p>
            <div className="footer-legal">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;