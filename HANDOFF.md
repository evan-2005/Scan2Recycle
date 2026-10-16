# Scan2Recycle — handoff

A complete briefing for whoever (person or AI assistant) picks this project up next. Read this first; [PLAN.md](PLAN.md) has the original plan and the measurements behind each decision, and [README.md](README.md) has the setup steps.

---

## 1. What it is

A free mobile web app (installable PWA) for a Malaysian community-service project. People:

1. **Scan an item** with the phone camera (or type it into **"Can I recycle…?"**, in English or Bahasa Melayu).
2. The AI, which runs **on the phone**, says what it is, its material, whether it's recyclable, and **which bin** it goes in, using Malaysia's 3-colour public bins (blue paper, orange plastic & metal, brown glass).
3. They can **save it** with an optional weight. **My Recycling** shows totals per material, a streak, a weekly goal and "you've diverted X kg".
4. **Drop-off** shows the nearest recycling points on a map. **Anyone can add a recycling hub**, and it appears for everyone straight away.
5. **Groups**: create or join with a 6-character code; a leaderboard shows members' totals by display name.
6. The whole UI switches between **English (default)** and **Bahasa Melayu**; item, material and bin names switch too.

- **Live:** <https://scan2-recycle.vercel.app>. Vercel deploys automatically on every push to `main`.
- **Repo:** <https://github.com/evan-2005/Scan2Recycle>.

---

## 2. Architecture (no custom backend)

```
Phone browser (React PWA)
 ├─ UI thread ── photo ──► Web Worker: SigLIP vision model (Transformers.js, ONNX/WASM)
 │                          label vectors precomputed in public/label-embeddings.json
 ├─ Supabase (Postgres + Auth + Row Level Security), via the publishable key
 ├─ Hugging Face Hub: model files, downloaded once (~100 MB) and cached by the browser
 └─ OpenStreetMap: tiles from tile.openstreetmap.org; recycling points from the Overpass API,
    plus a bundled snapshot of all Malaysian points (public/osm-points-my.json)
```

| Layer | Choice | Notes |
|---|---|---|
| App | React 19 + Vite 8 + TypeScript 6 + Tailwind 4 | `web/` |
| PWA | vite-plugin-pwa | The 27 MB ONNX WASM is excluded from precache and cached at runtime instead |
| AI | `Xenova/siglip-base-patch16-224`, q8 | Only the vision half downloads; text half only if labels are missing from the JSON |
| DB / auth | Supabase | Anonymous sign-in on first save; optional email + password ("Save my progress") |
| Map | Leaflet 1.9.4 + OSM tiles | CARTO tiles now need a key, so they're not used |
| Hosting | Vercel, root directory `web` | Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

---

## 3. ⚠️ Gotchas (read these)

1. **Two Supabase projects exist.** The app uses **`bvqctjqhcsuevcgzhyou`**. SQL run in the other project does nothing to the app (this caused hours of confusion). In the SQL Editor, check that the browser URL contains `bvqctjqhcsuevcgzhyou` first.
2. **The SQL Editor applies a file all-or-nothing.** If a run "did nothing", check for a red error, or the "destructive operation" pop-up being cancelled.
3. **Emails need custom SMTP.** Supabase's built-in email only sends to the project's own organisation members, at 2 per hour. The app supports confirmation and password-reset emails (`lib/account.ts`, `lib/authReturn.ts`, `features/account/`). Turn them on with Brevo SMTP plus "Confirm email" on; see README → "Verification and password-reset emails". Email links return as `/?auth=confirmed` or `/?auth=reset`, and the app reads the URL hash before supabase-js clears it. Those return URLs must be in Supabase's Redirect URLs list.
4. **The free Overpass servers are unreliable.** They time out, rate-limit (the browser then sees "Failed to fetch") or return 500 or 406. The app copes like this:
   - it tries the `overpass.private.coffee` mirror first, then `overpass-api.de`
   - it searches 8 km, and widens to 60 km only if fewer than 3 points turn up
   - results are cached for 24 h; when the servers are down, stale cache entries are used
   - the bundled Malaysia snapshot (250 points, Oct 2026) always shows

   Don't hammer the servers while testing.
5. **Secrets:** only the **publishable** key belongs in the app. A secret key (`sb_secret_…`) was pasted in a chat once; make sure it was deleted or rotated in Supabase → Project Settings → API Keys.
6. **Adding items** in Supabase works straight away for search. For the camera AI, also run `npm run embed-labels` in `web/` and push. Otherwise phones download the ~110 MB text model to embed the new labels themselves.
7. **The camera AI is decent, not perfect.** On 145 TrashNet photos it picks the right bin 81% of the time on the first guess (94% within the top 3). Real cluttered phone photos will score lower, so the UI leans on "Is it one of these?" (top 3) and "Not right? Change it".
8. **The Malay text was written by an AI** and should be reviewed by a native speaker before any launch.
9. **Saved data belongs to the browser**, via an anonymous Supabase user kept in localStorage. Safari and the home-screen app on iPhone count as separate users unless the person uses "Save my progress".

---

## 4. Where things are

```
supabase/
  setup_all.sql              everything below in one re-runnable file (the easy way)
  seed.sql                   7 materials (Malaysian bins) + 34 original items
  migrations/001_init.sql    tables: materials, item_types, recycling_logs; view user_totals; RLS
  migrations/002_grants.sql  explicit Data API grants
  migrations/003_more_items.sql  16 items
  migrations/004_features.sql    Malaysian bins, recycling_points, groups, group_members + RPCs
  migrations/005_languages_hubs.sql  Malay columns + translations, 38 items (88 total), open hubs
web/
  public/label-embeddings.json   precomputed SigLIP label vectors (npm run embed-labels)
  public/osm-points-my.json      snapshot of Malaysian OSM recycling points (npm run snapshot-points)
  scripts/embed-labels.mts       reads labels from seed.sql + migrations + live DB
  scripts/snapshot-points.mts    one big Overpass query for Malaysia
  src/
    i18n/        en.ts (reference), ms.ts (must have every key; enforced by TS + test),
                 translate.ts (msg(), format, plural), context.ts (useI18n: t, m, n),
                 localize.ts (itemName/itemTip/materialName/binName with English fallback),
                 I18nProvider.tsx (default English, remembered in localStorage)
    lib/         pure logic + Supabase calls; functions return { ok, value } | { ok: false, error: Message }
      classifier/   classifier.worker.ts, client.ts, model.ts (model id, templates), similarity.ts, decide.ts
      places/       api.ts (Overpass, snapshot, community hubs, add/delete), osm.ts, filter.ts, geo.ts, radius.ts
      account.ts auth.ts catalog.ts logs.ts groups.ts search.ts streaks.ts totals.ts weight.ts disposal.ts …
    features/    scan/ dropoff/ groups/ stats/ history/ account/ setup/   (React screens)
    hooks/       useLoad, useHashRoute (hash routing: #/scan, #/dropoff?material=…, #/groups?id=…), useGeolocation
```

**Conventions**
- Library code never returns English sentences. It returns a `Message` (`msg('error.x', vars)`), and screens render it with `m(message)`. New UI text goes in **both** `en.ts` and `ms.ts`; the build fails otherwise.
- Database text in two languages uses `*_ms` columns (`display_name_ms`, `tip_ms`, `bin_name_ms`), read through `localize.ts`, which falls back to English.
- `item_types.in_ai = false` means search-only: receipt, milk carton and food wrapper pulled paper and plastic photos into the wrong bin.
- Immutable updates, small files, pure helpers with Vitest tests next to them (`*.test.ts`).

---

## 5. Database model (Supabase, all with RLS)

| Table | Who can read | Who can write |
|---|---|---|
| `materials`, `item_types` | everyone | team only (dashboard / SQL) |
| `recycling_logs` | own rows | own rows (insert / update / delete) |
| `recycling_points` (hubs) | everyone (approved = true; default) + own | any signed-in user adds (max 10 a day, trigger); delete own |
| `groups`, `group_members` | members only (own memberships) | only via RPCs `create_group`, `join_group`, `leave_group`; `group_leaderboard` returns display names + totals to members |

Anonymous visitors (no session) can read materials, items and hubs, and nothing else.

---

## 6. Run, test, deploy

```bash
cd web
npm install
cp .env.example .env.local   # then paste the Supabase URL + publishable key of bvqctjqhcsuevcgzhyou
npm run dev                  # http://localhost:5173
npm test                     # Vitest, 157 tests
npm run lint
npm run build
npm run embed-labels         # after adding items
npm run snapshot-points      # every few months
```

- **Database setup / changes:** paste `supabase/setup_all.sql` (or a single new migration) into the SQL Editor of `bvqctjqhcsuevcgzhyou`. Re-runnable.
- **Deploy:** push to `main`; Vercel builds `web/`.
- **How things were verified:**
  - SQL rules: a local Postgres (PGlite) with simulated users.
  - Live checks against the real project: saving, groups (create, leaderboard, privacy, leave) and hubs.
  - Accuracy: a Node script running the same pipeline on TrashNet photos.
  - Screens: phone-size checks in a browser, in both languages.

---

## 7. Status (Oct 2026)

**Done**
- Scan → AI → bin, with confident / choose / pick-material flows.
- "Can I recycle…?" search (88 items, English + Malay) with a browse-all list.
- Save with weight, totals, streak, weekly goal, history and delete.
- Drop-off map: OSM + snapshot + community hubs, material filters, directions, "nearest available" note when nothing is within 8 km, add / delete own hubs.
- Groups and leaderboard.
- Email + password "Save my progress".
- Full English / Bahasa Melayu UI and data.

**Not yet verified**
- "Save my progress" sign-in on a real phone (not tested by the assistant, because it involves entering a password).
- An Android phone.
- Accuracy on the team's own real photos.

**Good next steps**
1. Have a native speaker review `web/src/i18n/ms.ts` and the `*_ms` values in `005_languages_hubs.sql`.
2. Collect 50+ real phone photos, measure accuracy, and adjust labels (`item_types.label`, `in_ai`) or thresholds (`decide.ts`).
3. Weigh common items and fill `item_types.typical_weight_g` (the weight box already shows "about N g" when it's set).
4. Moderation tools for hubs if spam appears: currently the team can only delete rows or untick `approved` in the Table Editor.
5. CO₂ estimate per material, only with sourced factors (PLAN.md §8).
6. Custom SMTP, so email confirmation and password reset work.
