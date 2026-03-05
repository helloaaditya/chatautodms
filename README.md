# ChatAutoDMs - Local Setup Guide

Follow these steps to run the Instagram Automation SaaS locally.

## 🛠 Prerequisites
- **Node.js**: v18 or later
- **Docker**: For running Supabase local environment
- **Supabase CLI**: [Installation Guide](https://supabase.com/docs/guides/cli)
- **Stripe CLI**: [Installation Guide](https://docs.stripe.com/stripe-cli)

## 1. Local Database Setup (Supabase)
1. Initialize Supabase:
   ```bash
   supabase init
   ```
2. Start local Supabase containers (requires Docker):
   ```bash
   supabase start
   ```
3. Run the migrations to initialize your local DB:
   ```bash
   supabase db reset
   ```
   *Note: This will apply the `supabase/migrations/20260301000000_initial_schema.sql` file.*

## 2. Frontend Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an `.env.local` file in the root:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_ANON_KEY=your_local_anon_key
   VITE_META_APP_ID=your_meta_app_id
   VITE_META_REDIRECT_URI=http://localhost:54321/functions/v1/auth-callback
   ```
   *Note: Get your local Supabase keys by running `supabase status`.*

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173) (or the port Vite prints).

4. **Magic link (email) login from localhost:**  
   If the verification email sends you to production instead of localhost, add your local URL to Supabase:
   - **Supabase Dashboard** → **Authentication** → **URL Configuration**
   - Under **Redirect URLs**, add: `http://localhost:5173/**` (use your actual port if different)
   - Save. Then when you request a magic link on localhost, the link in the email will redirect back to localhost after verification.

5. **Seeing "Connect account" on localhost but accounts exist in production?**  
   Use the **same** Supabase project locally so the app sees the same data:
   - In `.env.local` set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your **hosted** project (e.g. `https://xxxx.supabase.co`), not `http://localhost:54321`.
   - Log in on localhost with the **same email** you use in production. Accounts and automations are stored in Supabase, so they will appear once the URL and session match.
   - The `/api/*` routes (e.g. fetch accounts) are not run by Vite; the app falls back to direct Supabase when the API is unavailable. To run API routes locally, use `vercel dev` instead of `npm run dev`.

## 3. Local Webhooks (Meta & Stripe)
To test webhooks locally, use the CLI tools to forward events to your local functions.

**Stripe Webhooks:**
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe
```

**Meta Webhooks:**
Use a tool like **ngrok** to expose your local Supabase Edge Functions:
```bash
ngrok http 54321
```
Then, update your Meta App Webhook URL to point to the ngrok URL.

## 4. Environment Secrets
Don't forget to set your secrets in the local Supabase environment:
```bash
cp supabase/.env.example supabase/.env
```
Add your `META_APP_SECRET`, `STRIPE_SECRET_KEY`, etc. to this file.
