# Nearby MVP — implementation plan

## Product and implementation

Build a responsive Next.js App Router application for deployment on Vercel. Use Supabase Auth for verified email/password accounts; the user's Supabase Email provider must have email confirmation enabled. Use Supabase Postgres for durable profiles, private location coordinates, discovery views, swipes, mutual matches, and chat. Keep Supabase secrets server-side; provide an `.env.example` and SQL migration with row-level security so the app can be connected to a Supabase project without placing privileged keys in the browser. The initialized Manus managed database is not the production datastore because the requested hosting target is Vercel and the agreed MVP stack is Supabase.

Users create/edit a profile with display name, gender identity, short bio, genders they are interested in, and a maximum distance (MVP default: 50 km). Discovery requires a fresh successful browser geolocation permission/read; if permission is denied or unavailable, show no match cards and explain how to enable location. The server records the authenticated request's coordinates in a private table and returns only a candidate's public profile plus distance rounded to the nearest kilometer. A candidate is eligible only if the geographic distance is within both users' distance preferences and their stated gender preferences are mutually compatible; no age, popularity, activity, or other ranking/filtering signals are used. Order eligible candidates by distance only. A browser supplies the coordinates, so this MVP does not claim server-side proof of physical location or anti-spoofing.

A database function atomically records that a profile was exposed before returning its card, ensuring a refresh cannot show it again. A left/right action records one immutable decision per viewer/candidate. A mutual right swipe creates a unique match. Only match participants can read/post messages; use Supabase row-level policies and Realtime for the one-to-one chat. No account bypass or demo-auth path is included.

Vercel delivery consists of a self-contained Next.js source project, Supabase schema/migration and setup instructions, and required Vercel environment-variable names. Real login and persisted matchmaking require the user's Supabase project credentials and email-auth configuration; do not invent credentials. A Vercel publish/deploy is not assumed until the user connects the required account/project.

## Project structure

- `app/`: landing, auth, onboarding, discovery, matches, and chat pages; route handlers for profile, discovery, swipes, matches, and messages.
- `components/`: reusable branded navigation, profile card, swipe controls, forms, location gate, match list, and chat UI.
- `lib/supabase/`: browser/server clients and authenticated-session helpers.
- `supabase/migrations/`: tables, private data policies, discovery/swipe/match functions, and chat authorization policies.
- `public/`: route manifest and static app assets.
- `.env.example`: client-safe Supabase URL and public anon/publishable key; no service-role key is needed.

## Design

**Design Movement:** Contemporary romantic editorial, softened with playful scrapbook details.

**Core Principles:** Warm and human rather than clinical; make location and privacy states plain; keep one potential connection in focus; make every action gentle and reversible only before submission.

**Color Philosophy:** Cream and petal pink create warmth; a saturated raspberry red carries the brand's romantic energy; deep plum gives text and controls enough contrast.

**Layout Paradigm:** A mobile-first, single-card discovery stage with an airy profile header and lightweight top navigation; forms and chats use the same narrow, conversational rhythm rather than a dashboard grid.

**Signature Elements:** Hand-drawn heart-shaped accents; soft card corners with a subtle paper-like border; small distance pills that resemble love-note stamps.

**Interaction Philosophy:** Clear location permission before discovery; deliberate pass/like buttons; restrained motion that acknowledges a choice without hiding controls.

**Animation:** Gentle card lift/fade on reveal, small heart pulse after a like, and soft cross-fades between pages; respect reduced-motion settings and never make swiping the only accessible action.

**Typography System:** Editorial serif headlines (Georgia fallback) paired with a clean system sans-serif for body, controls, and data; short display headlines, comfortable body line-height, and legible small labels.

**Brand Essence:** A softer way to meet someone nearby, for people who want distance and mutual interest—not opaque compatibility scoring. Personality: tender, candid, playful.

**Brand Voice:** Warm, direct, and lightly flirtatious without pressure. Examples: “A little closer to love.” “Your location stays yours; we only use it to find nearby possibilities.”

**Wordmark & Logo:** A custom lowercase “nearby” wordmark with a small paired-heart ligature/mark, not a stock heart icon as the full logo.

**Signature Brand Color:** Raspberry rose (`#D94B73`).
