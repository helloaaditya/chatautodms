import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Zap, Target, BarChart3, ShieldCheck, Instagram, ArrowRight, PlayCircle } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare className="text-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter">ChatAutoDMs</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-500">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-blue-600 px-4 py-2 transition-colors">Login</Link>
          <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100 animate-bounce">
              <Zap size={16} />
              <span>New: AI Intent Detection</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Automate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600">Instagram Growth</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-xl">
              Turn your Instagram DMs and comments into a 24/7 sales machine. Connect with customers instantly, capture leads, and close more deals on autopilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                Start 14-Day Free Trial <ArrowRight size={20} />
              </Link>
              <button className="px-8 py-4 bg-white border-2 border-gray-100 hover:border-blue-200 text-gray-700 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-2">
                <PlayCircle size={20} /> Watch Demo
              </button>
            </div>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <p className="text-sm text-gray-500 font-medium">Joined by <span className="text-gray-900 font-bold">1,200+</span> businesses this month</p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400/20 blur-[100px] rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-400/20 blur-[100px] rounded-full" />
            <div className="relative bg-gray-50 border border-gray-100 rounded-[3rem] p-4 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
               <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80" alt="Dashboard Preview" className="rounded-[2.5rem] w-full shadow-inner" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-black mb-16 tracking-tight">Everything you need to scale on Instagram</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            {[
              { title: 'Auto Reply DMs', desc: 'Instant responses to every message based on smart keywords and AI logic.', icon: MessageSquare, color: 'text-blue-600' },
              { title: 'Comment Automation', desc: 'Automatically reply to comments with both a public reply and a private DM.', icon: Target, color: 'text-pink-600' },
              { title: 'Visual Flow Builder', desc: 'Build complex automation flows visually with our drag-and-drop interface.', icon: Zap, color: 'text-yellow-600' },
              { title: 'Lead Capture', desc: 'Ask for emails and phone numbers and sync them directly to your CRM.', icon: ShieldCheck, color: 'text-green-600' },
              { title: 'Detailed Analytics', desc: 'Track conversion rates, messages sent, and engagement performance.', icon: BarChart3, color: 'text-purple-600' },
              { title: 'Story Mentions', desc: 'Reply instantly whenever someone mentions you in their Instagram Story.', icon: Instagram, color: 'text-orange-600' },
            ].map((f) => (
              <div key={f.title} className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300">
                <f.icon className={`${f.color} mb-6`} size={32} />
                <h3 className="text-xl font-bold mb-3 tracking-tight">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-8">
        <div className="max-w-5xl mx-auto bg-blue-600 rounded-[3rem] p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
          <h2 className="text-5xl font-black text-white mb-8 tracking-tight">Ready to automate your Instagram?</h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join 5,000+ creators and brands using ChatAutoDMs to grow their business and engage with their community on autopilot.
          </p>
          <Link to="/login" className="inline-flex px-10 py-5 bg-white text-blue-600 rounded-2xl text-xl font-black shadow-2xl hover:bg-blue-50 transition-colors transform hover:scale-105 active:scale-95">
            Start Your Journey Now
          </Link>
        </div>
      </section>
    </div>
  );
};
