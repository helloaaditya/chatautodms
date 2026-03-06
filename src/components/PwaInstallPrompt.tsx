import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = window.__deferredInstallPrompt;
    if (stored) {
      setDeferredPrompt(stored);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = ev;
      setDeferredPrompt(ev);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDismissed(true);
    window.__deferredInstallPrompt = null;
    setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 shadow-lg text-sm">
      <span>Install Grow Creation</span>
      <button
        type="button"
        onClick={handleInstall}
        className="font-semibold text-blue-300 hover:text-white underline"
      >
        Install
      </button>
      <button
        type="button"
        onClick={() => { setDismissed(true); setDeferredPrompt(null); window.__deferredInstallPrompt = null; }}
        className="text-gray-400 hover:text-white"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
