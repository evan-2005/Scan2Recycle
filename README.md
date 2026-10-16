# Scan2Recycle

Take a photo of an item → AI identifies it → the app tells you which bin it goes in → log the weight → track your recycling totals.

The full plan is in [PLAN.md](PLAN.md). Built so far: scan → AI → bin, "Can I recycle…?" search, saving with weight, totals, streaks and a weekly goal, history, a drop-off map of nearby recycling points, groups with a leaderboard, and email sign-in to keep progress. Live at <https://scan2-recycle.vercel.app>.

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

Open the URL it prints. If something isn't set up, the Scan page shows a **Setup check** card saying what's missing.

### 2. Database (Supabase)
1. Create a free project at <https://supabase.com>.
2. **SQL Editor** → paste and run `supabase/setup_all.sql` (everything in one file, safe to re-run). It ends by showing row counts: materials 7, item_types 50.
   (Same result as running `migrations/001_init.sql` … `004_features.sql` in order, plus `seed.sql`.)
   Already set up earlier? Just run the newer files you haven't run yet: `003_more_items.sql`, `004_features.sql`.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** (needed to save scans).
   On the same page, under **Email**, turn **off "Confirm email"** so "Save my progress" works without an email service.
   (Supabase's built-in email only sends to your own team's addresses, 2 per hour. To keep confirmations on, set up
   custom SMTP, e.g. Resend or Brevo, under **Authentication → Emails → SMTP Settings**.)
4. **Project Settings → API Keys** → copy the Project URL and the **publishable** key (`sb_publishable_…`).
5. Copy `web/.env.example` to `web/.env.local` and paste them in. Restart `npm run dev`.

The **service_role / secret** key must never go in the web app.

> **Bins:** set to Malaysia's 3-colour public bins (blue paper, orange plastic & metal, brown glass). Edit them in
> **Table Editor → materials** if your area differs.

### Running the drop-off map
- Points come from **OpenStreetMap** plus the team's own list (`recycling_points`).
- **Approving suggestions:** users can suggest points in the app. They stay hidden until someone ticks **approved** in
  **Table Editor → recycling_points**. You can also add points there directly (set `approved` to true).
- Map tiles are OpenStreetMap's free tiles, fine for a school project. For heavy use, switch to a keyed provider (see `MapView.tsx`).

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
