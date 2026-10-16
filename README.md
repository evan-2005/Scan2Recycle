# Scan2Recycle

Take a photo of an item → AI identifies it → the app tells you which bin it goes in → log the weight → track your recycling totals.

The full plan is in [PLAN.md](PLAN.md). This repo is at **Phase 0 (setup)**.

```
hf-space/   Hugging Face Space: CLIP classifier behind a Gradio API (Python)
supabase/   Database schema (migrations/) and starter data (seed.sql)
web/        The app: React + Vite + TypeScript, installable PWA
```

## Phase 0 setup checklist

### 1. Run the app locally
Needs Node.js 20+.

```bash
cd web
npm install
npm run dev
```

Open the URL it prints. The Scan page shows a **Setup check** card. It turns green as you finish the steps below.

### 2. Database (Supabase)
1. Create a free project at <https://supabase.com>.
2. **SQL Editor** → paste and run `supabase/migrations/001_init.sql`, then `supabase/seed.sql`.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** (used in Phase 2).
4. **Project Settings → API** → copy the Project URL and the `anon` public key.
5. Copy `web/.env.example` to `web/.env.local` and paste them in. Restart `npm run dev`.

The **service_role / secret** key must never go in the web app.

> **Before demoing:** the bin names and colours in `seed.sql` are placeholders. Change them to match your local bins (PLAN.md §13), then re-run `seed.sql`.

### 3. AI (Hugging Face Space)
Follow [hf-space/README.md](hf-space/README.md) to create the Space, then set `VITE_HF_SPACE_ID` in `web/.env.local`.

### 4. Put it on a phone
- **Same Wi-Fi, quick look:** `npm run dev` prints a `Network:` URL. Open it on the phone. (The camera needs HTTPS, so for real use deploy instead.)
- **Deploy (recommended):** import the repo into <https://vercel.com> or <https://netlify.com>, set the **root directory** to `web`, add the three `VITE_*` variables, and deploy.
- On the phone, open the deployed link. Android Chrome: menu → **Install app**. iPhone Safari: Share → **Add to Home Screen**.

## Scripts (in `web/`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (also reachable from your phone on the same Wi-Fi) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | Lint (oxlint) |
| `npm run generate-pwa-assets` | Regenerate app icons from `public/favicon.svg` |
