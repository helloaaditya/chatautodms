# Instagram Login – Fix "Invalid platform app" and "Invalid redirect_uri"

If you see **Invalid Request: Invalid platform app** or **Invalid redirect_uri** when connecting Instagram, fix the Meta app setup and redirect URI as below.

---

## Fix "Invalid redirect_uri"

The redirect URI sent to Instagram **must match exactly** what you add in the Meta Dashboard (character-for-character).

### Use the Instagram product (not Facebook Login)

- Go to [developers.facebook.com](https://developers.facebook.com/apps) → your app.
- Left menu: **Instagram** → **API setup with Instagram login**.
- Open **Set up Instagram business login** → **Business login settings**.

Do **not** add the URI only under **Facebook Login** → Settings. Instagram uses its **own** list under **Instagram** → Business login settings → **Valid OAuth Redirect URIs**.

### Add the exact redirect URI

In **Instagram** → **Set up Instagram business login** → **Business login settings** → **Valid OAuth Redirect URIs**:

1. Add this **exact** URI (copy-paste; usually **no** trailing slash):

   **Production:**
   ```
   https://www.growcreation.in/auth/meta/callback
   ```

   **Local dev (optional):**
   ```
   http://localhost:5173/auth/meta/callback
   ```

2. If your dashboard already shows a URI **with** a trailing slash, set in Vercel / `.env.local`:
   ```
   VITE_META_REDIRECT_URI=https://www.growcreation.in/auth/meta/callback/
   ```
3. Click **Save**.

The app uses `VITE_META_REDIRECT_URI` if set; otherwise `window.location.origin + '/auth/meta/callback'`. So if you use a custom domain, set `VITE_META_REDIRECT_URI` to your full callback URL and add the **same** string in the dashboard.

---

## Fix "Invalid platform app"

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
     - `https://www.growcreation.in/auth/meta/callback`
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
- `VITE_META_REDIRECT_URI` = optional; exact callback URL if it must match the dashboard (e.g. with trailing slash). Default: `origin + '/auth/meta/callback'`.

**Supabase Edge Function secrets:**

- `META_APP_ID`, `META_APP_SECRET` = main app (or same as Instagram if one app).
- `INSTAGRAM_APP_ID` = **Instagram App ID** from Business login settings.
- `INSTAGRAM_APP_SECRET` = **Instagram App Secret** from the same section.
- `META_REDIRECT_URI` = `https://www.growcreation.in/auth/meta/callback`
- `META_APP_URL` = `https://www.growcreation.in`

If the Instagram App ID/Secret are the same as the main app, you can leave `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` unset and the function will use `META_APP_ID` / `META_APP_SECRET`.

## 4. After fixing

Redeploy the frontend and the `auth-callback` Edge Function, then try **Go To Instagram** again. Use an **Incognito/private** window if you had cached errors. The account you use must be an **Instagram Tester** while the app is in development.
