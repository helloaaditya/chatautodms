import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Storage that persists session to both localStorage and cookie */
const createPersistentStorage = () => {
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
  const COOKIE_PATH = '/';

  return {
    getItem(key: string): string | null {
      let value = localStorage.getItem(key);
      if (!value && typeof document !== 'undefined') {
        const match = document.cookie.match(new RegExp('(^| )' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]+)'));
        if (match) {
          try {
            value = decodeURIComponent(match[2]);
          } catch {
            value = null;
          }
        }
      }
      return value;
    },
    setItem(key: string, value: string): void {
      localStorage.setItem(key, value);
      if (typeof document !== 'undefined') {
        try {
          const cookieVal = encodeURIComponent(value);
          if (cookieVal.length < 4000) {
            const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `${key}=${cookieVal}; path=${COOKIE_PATH}; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
          }
        } catch {
          // Cookie may fail if value is too large; localStorage is primary
        }
      }
    },
    removeItem(key: string): void {
      localStorage.removeItem(key);
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; path=${COOKIE_PATH}; max-age=0`;
      }
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: createPersistentStorage(),
  },
});
