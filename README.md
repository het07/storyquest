# StoryQuest Arena

A voice-first learning platform. Search any topic for a clear, visual breakdown, browse trending topics by category, learn hands-free with voice, and test yourself with instant quizzes.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** + **motion** (animations)
- **MongoDB Atlas** via the official **`mongodb`** driver
- **Auth.js (NextAuth v5)** — Google OAuth + anonymous **guest mode** (cookie-based)
- **Exa AI** primary search (rate-limited to the team 10 QPS cap) → **Google Gemini** free fallback
- **ElevenLabs** TTS + **Wispr Flow** STT (with Web Speech API fallbacks) — _Phase 5_
- **recharts** (dashboard) + **@xyflow/react** (concept maps)

## Architecture notes

- **Data layer:** MongoDB. `src/lib/mongodb.ts` holds the connection singleton; `src/lib/db.ts` exposes typed collections (`searchQueries`, `topics`, plus the Auth.js `users`/`accounts`/`sessions`).
- **Identity:** Every visitor gets an anonymous guest id cookie (`sqa_guest`) set by `src/proxy.ts`, so the app has **no login wall**. `src/lib/identity.ts#resolveIdentity()` returns the signed-in user id when available, otherwise the guest id. When a guest signs in with Google, `/api/auth/migrate` reassigns their guest-owned data to the permanent account.
- **Graceful degradation:** With no `MONGODB_URI`, the app falls back to the curated topic list in `src/lib/topics-data.ts` and simply skips persistence. With no Google credentials, guest mode still works.

## Prerequisites

- Node.js 20+
- A free **MongoDB Atlas** cluster
- A **Google OAuth** client (for sign-in)
- API keys: Exa (search), Gemini (fallback), optionally ElevenLabs/Wispr (voice)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` (copy from `.env.example`) and fill in:

| Variable | Where to get it |
| --- | --- |
| `MONGODB_URI` | Atlas → Database → Connect → Drivers. URL-encode special chars in the password. |
| `MONGODB_DB` | Any database name, e.g. `storyquest`. |
| `AUTH_SECRET` | Run `npx auth secret` (or `openssl rand -base64 32`). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client (Web). |
| `EXA_API_KEY` | https://dashboard.exa.ai |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

   For Google OAuth, add this **authorized redirect URI**:
   `http://localhost:3000/api/auth/callback/google`

3. Seed the curated topics (also creates indexes):

```bash
npm run db:seed
```

4. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run db:seed` | Upsert curated topics + indexes into MongoDB. |

## Roadmap

- **Phase 1** — Landing page + theme ✅
- **Phase 2** — MongoDB + Auth.js (Google OAuth + guest mode) ✅
- **Phase 3** — Exa search with visual, easy-to-understand results ✅
- **Phase 4** — Trending topics + category browsing ✅
- **Phase 5** — Voice: STT (Wispr Flow → Web Speech fallback) + TTS (ElevenLabs → browser fallback) ✅
- **Phase 6** — Quiz system: Gemini-generated MCQs with scoring, explanations & XP ✅
- **Phase 7** — Dashboard: streak, XP, quiz accuracy & activity charts (recharts) ✅
- **Phase 8** — Polish: profile menu + logout, SEO (sitemap/robots/OG), 404/error/loading states ✅
- **Hands-free accessibility** — continuous voice mode for learners who cannot use hands (STT commands + TTS feedback for search, listen, quiz, navigation) ✅
