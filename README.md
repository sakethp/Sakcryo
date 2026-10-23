# Nearby — a little closer to love

A small dating-app MVP built with Next.js App Router, Supabase Auth, and Supabase Postgres. It is designed for Vercel. Discovery requires a successful browser location read, and eligibility uses only distance plus mutually compatible gender preferences. Each profile is exposed once; chat is limited to mutual matches and updates through Supabase Realtime, with a periodic HTTP refresh as recovery.

## Local setup

1. Create a Supabase project.
2. Run [`supabase/migrations/20261023000000_nearby_mvp.sql`](supabase/migrations/20261023000000_nearby_mvp.sql) once in the Supabase SQL Editor (or apply it with the Supabase CLI). This creates the schema, row-level security policies, discovery/matching functions, and adds messages to the `supabase_realtime` publication when it exists.
3. In Supabase **Authentication → Providers → Email**, enable the Email provider and email confirmations. In **Authentication → URL Configuration**, set the Site URL to your local URL (`http://localhost:3000`) and add `http://localhost:3000/auth/callback` to Redirect URLs. Add the exact Vercel production and Preview callback URLs ending in `/auth/callback` before testing those deployments.
4. Copy `.env.example` to `.env.local` and fill in the Supabase Project URL and public anon/publishable key:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

   The application does not require or use a Supabase service-role key; never put one in a `NEXT_PUBLIC_` variable.
5. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

6. Create an account, verify the email using the confirmation link, and complete the profile. Location permission is requested when discovery starts and again before each next card.

## Vercel deployment

Import the project repository into Vercel as a Next.js app. Keep the default Next.js build command (`pnpm build`) and install command (`pnpm install`). Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Vercel Project Settings → Environment Variables for each environment you intend to use (Production, Preview, and Development), then redeploy. Add each app domain's `/auth/callback` to Supabase Redirect URLs. Apply the SQL migration to the Supabase project before inviting testers.

The app returns a setup notice until Supabase credentials are configured. A live login/matchmaking deployment still requires your Supabase project, email-auth settings, and Vercel project/account; these are not embedded in this source project.

## Privacy and matching behavior

The app does not show match cards until browser geolocation returns a location. The coordinates go only to the authenticated, same-origin discovery endpoint. They are stored in a table with no direct client grants. The database returns profile details and distance rounded to the nearest kilometer; it never returns a map pin or exact coordinates. Since browser geolocation is supplied by the device/browser, the server cannot independently prove a physical location or prevent a modified client from spoofing coordinates; this MVP does not offer anti-spoof verification. The app requests location again before each next card. The profile preferences and both distance limits are applied reciprocally; no age, popularity, activity, or other ranking/filtering signal is used. Discovery views and swipe decisions are persisted and immutable. The chat APIs and message table policies verify that the requester is one of the two matched users.

This is an MVP foundation, not a complete public-launch safety program. Before inviting a broad audience, add and operate report/block, moderation, abuse response, age-eligibility, and jurisdiction-specific privacy/legal controls.
