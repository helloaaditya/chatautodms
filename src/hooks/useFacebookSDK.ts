import { useState, useEffect } from 'react';

export function useFacebookSDK() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.FB) {
      setIsReady(true);
      return;
    }
    const checkFB = () => {
      if (window.FB) {
        setIsReady(true);
        return true;
      }
      return false;
    };
    if (window.fbAsyncInit) {
      const original = window.fbAsyncInit;
      window.fbAsyncInit = function () {
        original?.();
        checkFB();
      };
    } else {
      window.fbAsyncInit = checkFB;
    }
    const id = setInterval(() => {
      if (checkFB()) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return { isReady, FB: window.FB };
}
