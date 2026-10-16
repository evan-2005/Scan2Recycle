# Scan2Recycle

Take a photo of an item → AI identifies it → the app tells you which bin it goes in → log the weight → track your recycling totals.

**New here (person or AI)? Start with [HANDOFF.md](HANDOFF.md).** The full plan is in [PLAN.md](PLAN.md). Built so far: scan → AI → bin, "Can I recycle…?" search, saving with weight, totals, streaks and a weekly goal, history, a drop-off map where anyone can add recycling hubs, groups with a leaderboard, email sign-in to keep progress,
and a full English / Bahasa Melayu switch. Live at <https://scan2-recycle.vercel.app>.

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
2. **SQL Editor** → paste and run `supabase/setup_all.sql` (everything in one file, safe to re-run). It ends by showing row counts: materials 7, item_types 88.
   (Same result as running `migrations/001_init.sql` … `005_languages_hubs.sql` in order, plus `seed.sql`.)
   Already set up earlier? Just run the newer files you haven't run yet (latest: `005_languages_hubs.sql`).
   **Run it in project `bvqctjqhcsuevcgzhyou`** (the browser address must contain it); the app ignores any other project.
3. **Authentication → Sign In / Providers** → turn on **Allow anonymous sign-ins** (needed to save scans).
   On the same page, under **Email**, turn **off "Confirm email"** so "Save my progress" works without an email service.
   (Supabase's built-in email only sends to your own team's addresses, 2 per hour. To keep confirmations on, set up
   custom SMTP, e.g. Resend or Brevo, under **Authentication → Emails → SMTP Settings**.)
4. **Project Settings → API Keys** → copy the Project URL and the **publishable** key (`sb_publishable_…`).
5. Copy `web/.env.example` to `web/.env.local` and paste them in. Restart `npm run dev`.

The **service_role / secret** key must never go in the web app.

> **Bins:** set to Malaysia's 3-colour public bins (blue paper, orange plastic & metal, brown glass). Edit them in
> **Table Editor → materials** if your area differs.

### Verification and password-reset emails
Supabase's built-in email only reaches your own Supabase organisation's addresses (2 an hour), so real users need a
free email service. Brevo's free plan sends 300 emails a day.
1. **Brevo** (<https://www.brevo.com>): sign up, verify a sender email address (**Senders, domains & IPs → Senders**),
   then **SMTP & API → SMTP** and generate an **SMTP key**. Note the login shown there.
2. **Supabase → Authentication → Emails → SMTP Settings**: enable custom SMTP, then fill in
   host `smtp-relay.brevo.com`, port `587`, username = the Brevo SMTP login, password = the SMTP key,
   sender email = the address you verified in Brevo, sender name `Scan2Recycle`.
3. **Supabase → Authentication → URL Configuration**: Site URL `https://scan2-recycle.vercel.app`; add Redirect URLs
   `https://scan2-recycle.vercel.app/**` and `http://localhost:5173/**`.
4. **Supabase → Authentication → Sign In / Providers → Email**: turn **"Confirm email" on**.
5. Optional: **Authentication → Emails → Templates** to reword the "Confirm email change" and "Reset password" emails
   (e.g. in English and Malay).

How it works in the app: "Save my progress" sends a confirmation link → the user opens it → the app shows
"Email confirmed, now set a password" → done. "Forgot password?" sends a reset link → the app shows "Set a new password".
With "Confirm email" off, no email is sent and the account is created immediately.

### Running the drop-off map
- Points come from **OpenStreetMap** (live search plus a bundled snapshot of all Malaysian points, `public/osm-points-my.json`)
  and **community hubs** that anyone can add in the app (`recycling_points`). Added hubs show immediately; people can
  delete their own. To remove someone else's, delete the row in **Table Editor → recycling_points**.
- If nothing is within 8 km, the list shows the nearest available points anywhere and says so.
- Refresh the snapshot every few months with `npm run snapshot-points` (in `web/`) and push.
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
| `npm run embed-labels` | Recompute `public/label-embeddings.json` from `seed.sql`, the migrations and the live item list |
| `npm run snapshot-points` | Re-download all OpenStreetMap recycling points in Malaysia to `public/osm-points-my.json` |
