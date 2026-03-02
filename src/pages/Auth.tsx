import React, { useState } from 'react';
import { supabase } from '../api/supabase';
import { MessageSquare, Chrome, Facebook, Mail, ArrowRight, Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });
    if (error) alert(error.message);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage('Check your email for the magic link!');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex w-16 h-16 bg-blue-600 rounded-3xl items-center justify-center shadow-2xl shadow-blue-500/30 mb-4 animate-in zoom-in duration-500">
            <MessageSquare className="text-white" size={32} />
          </div>
          <h2 className="text-4xl font-black tracking-tight">Welcome back</h2>
          <p className="text-gray-500 font-medium">Log in or create your account to continue</p>
        </div>

        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
          <button 
            onClick={() => handleSocialLogin('google')}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 rounded-2xl font-bold transition-all active:scale-[0.98]"
          >
            <Chrome size={20} className="text-blue-500" />
            Continue with Google
          </button>
          <button 
            onClick={() => handleSocialLogin('facebook')}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/10 active:scale-[0.98]"
          >
            <Facebook size={20} fill="white" />
            Continue with Facebook
          </button>
          
          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
             <div className="relative flex justify-center text-xs font-bold uppercase"><span className="bg-white px-4 text-gray-400">or with email</span></div>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-medium transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Sending link...' : 'Send Magic Link'}
              <ArrowRight size={20} />
            </button>
            {message && <p className="text-center text-sm font-bold text-blue-600">{message}</p>}
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 px-8 leading-relaxed font-medium">
          By continuing, you agree to ChatAutoDMs' <span className="text-gray-900 underline font-bold">Terms of Service</span> and <span className="text-gray-900 underline font-bold">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};
