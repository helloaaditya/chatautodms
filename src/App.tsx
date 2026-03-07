import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './api/supabase';
import { Layout } from './components/layout/Layout';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { LandingPage } from './pages/Landing';
import { AuthPage } from './pages/Auth';
import { PrivacyPolicy } from './pages/Privacy';
import { TermsOfService } from './pages/Terms';
import { AuthMetaCallback } from './pages/AuthMetaCallback';
import { ConnectInstagram } from './pages/Connect';
import { Automations } from './pages/Automations';
import { FlowSetup } from './pages/FlowSetup';
import { Analytics } from './pages/Analytics';
import { Leads } from './pages/Leads';
import { Settings } from './pages/Settings';
import { Billing } from './pages/Billing';
import { Admin } from './pages/Admin';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Give the redirect a small buffer if we see a code or token in the URL
      const hasAuthParams = window.location.hash || window.location.search.includes('code=');
      if (!hasAuthParams) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // Done loading once we have an auth event
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPublicRoute = ['/', '/login'].includes(location.pathname);

  // Protected Route Wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!session) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
  };

  return (
    <>
    <PwaInstallPrompt />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/auth/meta/callback" element={<AuthMetaCallback />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/connect" element={<ProtectedRoute><ConnectInstagram /></ProtectedRoute>} />
      <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
      <Route path="/automations/new/:templateId" element={<ProtectedRoute><FlowSetup /></ProtectedRoute>} />
      <Route path="/automations/edit/:automationId" element={<ProtectedRoute><FlowSetup /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

export default App;
