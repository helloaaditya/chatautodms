# Instagram Login – Fix "Invalid platform app"

If you see **Invalid Request: Invalid platform app** when connecting Instagram, the Meta app must be set up for **Instagram API with Instagram Login** and use the correct URLs/IDs.

## 1. Use the correct authorize URL

The app now uses **`https://api.instagram.com/oauth/authorize`** (not `www.instagram.com`), as in [Meta’s OAuth reference](https://developers.facebook.com/docs/instagram-platform/reference/oauth-authorize/).

## 2. Meta App Dashboard checklist

In [developers.facebook.com](https://developers.facebook.com/apps) → your app:

1. **Add Instagram product**
   - Left menu: **Instagram** → **API setup with Instagram login** (not “with Facebook login”).
   - If you don’t see “API setup with **Instagram** login”, add the **Instagram** product to the app first.

2. **Business login settings**
   - Go to **Instagram** → **API setup with Instagram login** → **Set up Instagram business login**.
   - Open **Business login settings**.
   - Note the **Instagram App ID** and **Instagram App Secret** (they can differ from the main Facebook App ID).

3. **OAuth Redirect URIs**
   - In the same **Business login settings**, add:
     - `https://chatautodms.vercel.app/auth/meta/callback`
     - For local: `http://localhost:5173/auth/meta/callback` (or your dev port).
   - Save. The redirect URI must match exactly (no trailing slash unless the dashboard shows one).

4. **Instagram testers (development mode)**
   - **App roles** → **Roles** (or Instagram → **Instagram testers**).
   - Add the Instagram account you use to connect as an **Instagram Tester**.
   - In development mode, only testers can complete the flow.

## 3. Environment variables

**Frontend (e.g. Vercel / `.env.local`):**

- `VITE_META_APP_ID` = main Meta App ID (or use Instagram App ID if you prefer one ID everywhere).
- `VITE_INSTAGRAM_APP_ID` = **Instagram App ID** from Business login settings (optional; if set, this is used for the Connect button instead of `VITE_META_APP_ID`).

**Supabase Edge Function secrets:**

- `META_APP_ID`, `META_APP_SECRET` = main app (or same as Instagram if one app).
- `INSTAGRAM_APP_ID` = **Instagram App ID** from Business login settings.
- `INSTAGRAM_APP_SECRET` = **Instagram App Secret** from the same section.
- `META_REDIRECT_URI` = `https://chatautodms.vercel.app/auth/meta/callback`
- `META_APP_URL` = `https://chatautodms.vercel.app`

If the Instagram App ID/Secret are the same as the main app, you can leave `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` unset and the function will use `META_APP_ID` / `META_APP_SECRET`.

## 4. After fixing

Redeploy the frontend and the `auth-callback` Edge Function, then try **Go To Instagram** again. Use an **Incognito/private** window if you had cached errors. The account you use must be an **Instagram Tester** while the app is in development.
