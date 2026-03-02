/// <reference types="vite/client" />

interface FBAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
}

interface FBStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: FBAuthResponse;
}

interface Window {
  FB?: {
    init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
    login: (callback: (res: FBStatusResponse) => void, options?: { scope?: string }) => void;
    getLoginStatus: (callback: (res: FBStatusResponse) => void) => void;
    AppEvents: { logPageView: () => void };
  };
  fbAsyncInit?: () => void;
}
