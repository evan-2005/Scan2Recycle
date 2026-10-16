# Scan2Recycle

Take a photo of an item → AI identifies it → the app tells you which bin it goes in → log the weight → track your recycling totals.

The full plan is in [PLAN.md](PLAN.md). Built so far: setup, scan → AI → bin (Phase 1), and saving with weight, totals and history (Phase 2). Live at <https://scan2-recycle.vercel.app>.

```
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
2. **SQL Editor** → paste and run `supabase/setup_all.sql` (everything in one file, safe to re-run). It ends by showing row counts: materials 7, item_types 50.
   (Same result as running `migrations/001_init.sql`, `002_grants.sql`, `003_more_items.sql` and `seed.sql`.)
   Already set up before the extra items were added? Just run `migrations/003_more_items.sql`.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** (needed to save scans).
4. **Project Settings → API Keys** → copy the Project URL and the **publishable** key (`sb_publishable_…`).
5. Copy `web/.env.example` to `web/.env.local` and paste them in. Restart `npm run dev`.

The **service_role / secret** key must never go in the web app.

> **Before demoing:** the bin names and colours in `seed.sql` are placeholders. Change them to match your local bins (PLAN.md §13), then re-run `seed.sql`.

### 3. AI (nothing to set up)
The AI runs **on the phone** with [Transformers.js](https://huggingface.co/docs/transformers.js), Hugging Face's in-browser library.
On the first scan the app downloads the vision half of [`Xenova/siglip-base-patch16-224`](https://huggingface.co/Xenova/siglip-base-patch16-224)
from the Hugging Face Hub (about 100 MB, then cached). No account, token or server is needed, and photos never leave the phone.

Item labels are embedded ahead of time into `web/public/label-embeddings.json`. **After adding items in Supabase, run
`npm run embed-labels` in `web/` and push**, otherwise phones have to download the text model (~110 MB) to embed the new labels.

### 4. Put it on a phone
- **Same Wi-Fi, quick look:** `npm run dev` prints a `Network:` URL. Open it on the phone. (The camera needs HTTPS, so for real use deploy instead.)
- **Deploy (recommended):** import the repo into <https://vercel.com> or <https://netlify.com>, set the **root directory** to `web`, add the two `VITE_*` variables, and deploy.
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
| `npm run embed-labels` | Recompute `public/label-embeddings.json` from `seed.sql` + the live item list |
