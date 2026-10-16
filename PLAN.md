# Scan2Recycle — Project Plan

Snap a photo of an item → AI says what it is, what material it is, and which bin it goes in → user optionally logs the weight → app tracks totals per material and the waste they've diverted.

---

## 1. Scope

### MVP (must have)
| # | Feature | Notes |
|---|---------|-------|
| 1 | Take / upload a photo | Phone camera or gallery |
| 2 | AI identification | Item name, material, recyclable yes/no, confidence |
| 3 | Bin instruction | e.g. "Place in Metal Recycling Bin", with bin colour |
| 4 | Manual correction | If the AI is unsure or wrong, user picks the material |
| 5 | Optional weight entry | Grams; skip allowed |
| 6 | "My Recycling" totals | kg per material (Plastic, Paper, Metal, Glass) + total |
| 7 | Impact message | "You've diverted X kg from general waste" |
| 8 | Data saved in a database | Per user, survives closing the app / switching phones |

### Stretch (only after MVP works)
- Typical-weight suggestion per item ("an aluminium can is usually ~15 g") so users don't need a scale
- History list with delete/edit
- Estimated CO₂ saved (needs sourced emission factors — see §8)
- Group/class leaderboard (useful for a community-service drive)
- Streaks / badges
- "Not recyclable — here's why" tips (greasy pizza box, soft plastics, etc.)
- Installable Android APK (see §10)

### Out of scope
- Hardware (smart bins, scales over Bluetooth)
- Training a model from scratch

---

## 2. Architecture

```
 ┌───────────────────────────────────────────┐
 │  Phone browser / PWA (React + Vite)       │
 │                                           │
 │  UI thread ──photo──► Web Worker          │
 │                       SigLIP (Transformers.js)
 │                       runs ON the phone   │
 └──────┬──────────────────────┬─────────────┘
        │ first scan only:     │ item list, save / read logs
        │ download model       ▼
        ▼               ┌──────────────────────────┐
 ┌──────────────────┐   │ Supabase                 │
 │ Hugging Face Hub │   │  • Postgres database     │
 │ (model files,    │   │  • Auth (anonymous/email)│
 │  ~100 MB, cached)│   │  • Row Level Security    │
 └──────────────────┘   └──────────────────────────┘
```

**No backend server and no AI server.** The app talks to two hosted services directly:
- **Hugging Face Hub**: only serves the model files once. After that the browser caches them, and the AI runs entirely on the phone.
- **Supabase**: database and login. Row Level Security means each user can only read and write their own rows, so the publishable key is safe in the app.

> **Change (Oct 2026):** the original plan ran CLIP in a Hugging Face *Space*. Hugging Face now requires a paid plan to create Gradio/Docker Spaces, so the model moved onto the phone (option C below). Side benefits: no cold starts, no rate limits, and photos never leave the device. After the first phone tests, CLIP was replaced by SigLIP, which is far more accurate (§4.3).

---

## 3. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| App | **React + Vite + TypeScript**, built as a **PWA** | One codebase runs on iPhone, Android and laptop. Load on someone's phone by sending a link; no app store. |
| Styling | Tailwind CSS | Fast to build mobile layouts |
| Charts | Plain CSS bars | Four bars don't need a chart library |
| AI | **Transformers.js** (`@huggingface/transformers`) running `Xenova/siglip-base-patch16-224`, 8-bit quantised | Hugging Face's own library. Free, offline after first load, private |
| AI runtime | ONNX Runtime Web (WASM) inside a **Web Worker** | Keeps the UI smooth while the model runs |
| Database | **Supabase** (Postgres) free tier | Real SQL database, built-in auth, generous free tier |
| Hosting | Vercel or Netlify (free) | HTTPS URL is required for the phone camera and PWA install |
| Tests | Vitest (unit), Playwright (end-to-end) | |

### AI options considered

| Option | Cost | Status |
|--------|------|--------|
| A. Own HF Space + CLIP (Gradio) | Needs a paid HF plan since 2026 | Dropped |
| B. HF Inference Providers API + vision-language model | ~$0.10/month free credit, then paid; needs a server (e.g. Supabase Edge Function) to hide the token | Possible upgrade later if accuracy needs it |
| **C. SigLIP on the phone with Transformers.js** | Free | **In use** |

Costs of option C: a one-time ~100 MB download on the first scan (warn users to use Wi-Fi), and slower scans on old phones (a few seconds per photo).

---

## 4. AI identification design

### 4.1 How it works
The model (SigLIP) turns a photo and a sentence into vectors, and similar things end up close together. We compare the photo against one sentence per item and pick the closest.

```
ahead of time:  npm run embed-labels → text model embeds every item label → web/public/label-embeddings.json
first scan:     phone downloads the vision model (~100 MB, cached) + the 76 KB label file
each scan:      photo → shrink to 512 px → vision model → compare with label vectors → softmax
                top label ──► item_types row ──► { item, material, recyclable, bin }
```

Each label is embedded with three phrasings and averaged ("prompt ensembling"): `a photo of {}`, `a close-up photo of {}`, `a photo of {}, a piece of rubbish`.

Labels added in Supabase that are not in the label file still work: the phone then downloads the text model (~110 MB, once) and embeds them itself. Re-run `npm run embed-labels` and push to avoid that.

### 4.2 Label → material table (lives in the database, `item_types`)
The 50 starter items are in `supabase/seed.sql` (16 were added after the first phone tests: squeeze tubes, toys, toothbrushes, cereal boxes, and so on). Example rows:

| label (prompt text) | display name | material | recyclable | note |
|---|---|---|---|---|
| an aluminium drink can | Aluminium Can | metal | yes | Rinse first |
| a plastic water bottle | Plastic Bottle | plastic | yes | Check if caps are accepted |
| a squeeze tube of lotion or toothpaste | Squeeze Tube | plastic | no | Multi-layer, usually not accepted |
| a plastic toy | Toy | general | no | Donate if it works |
| a cardboard box | Cardboard Box | paper | yes | Flatten |
| a greasy pizza box | Greasy Pizza Box | paper | no | Food contamination |
| a battery | Battery | e-waste | no | Special e-waste drop-off |

An item can be made of a recyclable material but still not be recyclable (paper cup, squeeze tube). Those are sent to the **general** waste bin (`web/src/lib/disposal.ts`).

### 4.3 Model choice, accuracy and confidence rules
Measured on 145 photos from the TrashNet dataset (25 each of cardboard, paper, glass, metal and plastic, plus 20 general rubbish). The metric is **"did the user get the right bin"**:

| Model (8-bit) | Phone download | Right bin, top guess | Right bin in top 3 | Status |
|---|---|---|---|---|
| CLIP ViT-B/32 | ~150 MB | 57% | 91% | First version |
| CLIP ViT-B/16 | ~150 MB | 60% | 88% | |
| MobileCLIP S2 | ~100 MB | 19% | 44% | Doesn't work with this setup |
| **SigLIP base/16** | **~100 MB** (vision only) | **80%** | **96%** | **In use** |
| CLIP ViT-L/14 | ~430 MB | 83% | 96% | Too big for phones |

With SigLIP and all 50 labels: 80% top guess, 94% in the top 3. Weakest: paper (60%) and plastic (64%), often confused with snack packets, cling film and egg cartons.

| Top score | Share of photos | App behaviour |
|-----------|-----------------|---------------|
| ≥ 0.6 | ~52% (87% of these right) | Show the answer, with "Not right? Change it" |
| 0.1 – 0.6 | ~48% | "Is it one of these?" top 3, each showing its material, plus "None of these" |
| < 0.1 | ~0% | "What is it made of?" material picker |

Thresholds are in `web/src/lib/classifier/decide.ts`; the model settings are in `web/src/lib/classifier/model.ts`. TrashNet photos are on a plain white background, so **re-measure with your own phone photos** (§11) and tune the label list and thresholds.

Ways to improve accuracy later: better label wording, removing look-alike labels, or option B (a vision-language model through an API).

### 4.4 Code
| File | Job |
|------|-----|
| `web/src/lib/classifier/model.ts` | Model id, prompt templates, temperature (shared with the script) |
| `web/scripts/embed-labels.mts` | `npm run embed-labels`: precomputes `public/label-embeddings.json` |
| `web/src/lib/classifier/classifier.worker.ts` | Loads the vision model and label vectors; embeds missing labels on-device; classifies photos |
| `web/src/lib/classifier/client.ts` | `prepareClassifier(labels, onProgress)` and `classifyImage(blob)` for the UI |
| `web/src/lib/classifier/similarity.ts` | Cosine similarity, softmax, prompt ensembling (pure, unit-tested) |
| `web/src/lib/classifier/decide.ts` | Scores → confident / choose / unknown (pure, unit-tested) |
| `web/src/lib/image.ts` | Validates and shrinks the photo before it goes to the model |

---

## 5. Database (Supabase / Postgres)

### 5.1 Tables
```sql
-- Materials and where they go. Bin names/colours are LOCAL — fill in for your area.
create table materials (
  id           text primary key,           -- 'plastic','paper','metal','glass','organic','e-waste'
  display_name text not null,
  bin_name     text not null,              -- e.g. 'Metal Recycling Bin'
  bin_colour   text not null,              -- hex, for the UI chip
  is_recyclable boolean not null
);

-- Items the AI can recognise (see §4.2)
create table item_types (
  id             serial primary key,
  label          text unique not null,     -- prompt text sent to the model
  display_name   text not null,
  material_id    text not null references materials(id),
  recyclable     boolean not null,
  typical_weight_g numeric,                -- stretch feature
  tip            text
);

-- One row per scanned/logged item
create table recycling_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_type_id int references item_types(id),
  material_id  text not null references materials(id),
  weight_g     numeric check (weight_g is null or (weight_g > 0 and weight_g < 50000)),
  ai_label     text,                        -- what the AI said
  ai_score     numeric,
  was_corrected boolean not null default false,  -- user overrode the AI
  created_at   timestamptz not null default now()
);
create index on recycling_logs (user_id, created_at desc);

-- Per-user totals (what the "My Recycling" screen reads)
create view user_totals with (security_invoker = true) as
select user_id, material_id,
       count(*)                       as items,
       coalesce(sum(weight_g),0)/1000 as kg
from recycling_logs
group by user_id, material_id;
```

### 5.2 Security (Row Level Security)
```sql
alter table recycling_logs enable row level security;
create policy "own rows - read"   on recycling_logs for select using (auth.uid() = user_id);
create policy "own rows - insert" on recycling_logs for insert with check (auth.uid() = user_id);
create policy "own rows - update" on recycling_logs for update using (auth.uid() = user_id);
create policy "own rows - delete" on recycling_logs for delete using (auth.uid() = user_id);

alter table materials  enable row level security;
alter table item_types enable row level security;
create policy "public read" on materials  for select using (true);
create policy "public read" on item_types for select using (true);
```

### 5.3 Login
- **Anonymous sign-in** on first open (Supabase supports this) → zero friction, user starts scanning immediately.
- Optional "Save my progress" button → links an email (magic link) so data moves with them to another phone.

### 5.4 Photos
Photos never leave the phone: the AI runs on-device, and only the AI result and weight are saved. If you later want photos for improving the label list, add an explicit opt-in and a Supabase Storage bucket.

---

## 6. Screens & user flow

```
[Home]  big "Scan item" button + this week's total
   │
   ▼
[Camera]  <input type="file" accept="image/*" capture="environment">
   │      (opens the rear camera on phones; gallery also allowed)
   ▼
[Analysing…]  first scan only: "Getting the AI ready" with a download % bar
   │
   ▼
[Result]  Detected: Aluminium Can
          Material: Metal   Recyclable: ✅ Yes
          ■ Place in Metal Recycling Bin   (colour chip)
          Tip: Rinse first
          [Wrong? Change]           ← manual correction
   │
   ▼
[Weight]  Weight (g, optional): [ 32 ]   [Save to My Recycling]
   │
   ▼
[My Recycling]  Plastic 1.2 kg | Paper 2.4 kg | Metal 0.8 kg | Glass 0.6 kg
                Total 5.0 kg  + bar chart
                🌱 You've helped divert 5.0 kg of recyclable waste from general waste.
```

Bottom nav: **Scan · My Recycling · History**.

Non-recyclable result shows a red ✕ card with the reason and the right disposal (general waste / e-waste drop-off). It is not saved, because totals only count recyclables.

---

## 7. Project structure

```
scan2recycle/
├── supabase/
│   ├── setup_all.sql                -- one-file setup for the SQL Editor (re-runnable)
│   ├── migrations/001_init.sql      -- tables, view, RLS (§5)
│   ├── migrations/002_grants.sql    -- Data API grants
│   ├── migrations/003_more_items.sql -- 16 extra items
│   └── seed.sql                     -- materials + item_types rows
├── web/
│   ├── index.html
│   ├── public/label-embeddings.json -- precomputed label vectors (npm run embed-labels)
│   ├── scripts/embed-labels.mts     -- generates the file above
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  -- routes + bottom nav
│   │   ├── lib/
│   │   │   ├── supabase.ts          -- client init
│   │   │   ├── classifier/          -- model worker, client, similarity, decide (§4.4)
│   │   │   ├── catalog.ts           -- loads materials + item_types
│   │   │   ├── disposal.ts          -- which bin an item goes in
│   │   │   ├── image.ts             -- resize/validate photo
│   │   │   ├── auth.ts, logs.ts     -- anonymous sign-in; save / load / delete logs
│   │   │   ├── weight.ts            -- parse the optional weight box
│   │   │   └── totals.ts            -- grams → kg per material, impact text
│   │   ├── features/
│   │   │   ├── scan/                -- ScanPage, ResultCard, SaveForm, ChoicePicker, MaterialPicker
│   │   │   ├── stats/               -- MyRecyclingPage, MaterialBars
│   │   │   └── history/             -- HistoryPage
│   │   └── types.ts
│   ├── tests/                       -- Vitest unit tests
│   ├── e2e/                         -- Playwright tests
│   ├── .env.example                 -- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│   └── vite.config.ts               -- vite-plugin-pwa
└── README.md
```

Secrets: only the Supabase **publishable** key goes in `.env`. Never put a Supabase secret / `service_role` key in the frontend. Add `.env` to `.gitignore`.

---

## 8. Environmental impact

**MVP:** only report what you actually know — kilograms diverted:
> 🌱 You've helped divert **5.0 kg** of recyclable waste from general waste.

Only count items where `recyclable = true` and a weight was entered. Show "+ N items without a weight" so the number is honest.

**Stretch — CO₂ estimate:** add `co2_saved_per_kg` to `materials`, filled from a cited source (e.g. US EPA WARM model, or your country's environment agency). Show it as "≈ X kg CO₂e avoided (estimate)" with the source linked. Don't invent the factors.

---

## 9. Build phases

Assumes a team of ~3–4. Adjust dates to your deadline.

### Phase 0 — Setup (½ week)
- [x] Create GitHub repo, add everyone
- [x] Create Supabase project, run `setup_all.sql`
- [x] Scaffold `web/` with Vite React TS, Tailwind, vite-plugin-pwa
- [x] Deploy to Vercel → confirm the link opens on a phone
- [ ] **Decide local bin rules** (§13) and update `seed.sql`

### Phase 1 — AI working end to end (1 week)
- [x] On-device model in a Web Worker (Transformers.js), labels from `item_types`
- [x] `image.ts` resize/validate, `decide.ts`, `disposal.ts`
- [x] Scan page → Result / "Is it one of these?" / material picker
- [x] Baseline accuracy on 145 TrashNet photos (§4.3)
- [ ] Collect 50+ photos of real items with the team's phones and re-measure accuracy
- [x] First phone test (iPhone): works; accuracy too low with CLIP → switched to SigLIP, added 16 items
- [ ] Test on an Android phone

### Phase 2 — Database & tracking (1 week)
- [x] Anonymous auth (on first save)
- [x] Weight form → insert into `recycling_logs`
- [x] My Recycling page: totals per material (computed from the user's logs) + bars + impact banner
- [x] Manual correction flow (sets `was_corrected = true`)

### Phase 3 — Polish & phone (½–1 week)
- [ ] PWA icons, splash colour, "Add to Home Screen" instructions screen
- [ ] Loading / cold-start / offline / error messages
- [x] History page with delete
- [ ] Accessibility pass: large tap targets, labels, colour + text (not colour alone) for bins
- [ ] Test on at least one iPhone and one Android

### Phase 4 — Stretch (if time)
- Typical weights, leaderboard, CO₂, Capacitor APK, offline Transformers.js

### Suggested roles
| Person | Owns |
|--------|------|
| A | AI label list, accuracy testing |
| B | Supabase schema, auth, totals |
| C | Scan + Result + Weight screens |
| D | My Recycling, History, PWA/phone testing, presentation |

---

## 10. Getting it onto someone's phone

**Option 1 — PWA link (recommended, works on iPhone and Android):**
1. Deploy `web/` to Vercel/Netlify (gives an `https://…` URL — HTTPS is required for camera access).
2. Send the link or show a QR code.
3. Android Chrome: menu → **Install app**. iPhone Safari: Share → **Add to Home Screen**.
4. It now opens full-screen with its own icon, like a normal app.

**Option 2 — Android APK (stretch):** wrap the same build with **Capacitor** (`npx cap add android`), build in Android Studio, and sideload the `.apk`. iPhone native install needs a paid Apple developer account, so stick with the PWA for iPhones.

---

## 11. Testing

| Type | What | Tool |
|------|------|------|
| Unit | `decide.ts` thresholds, `totals.ts` (g→kg, rounding, excludes non-recyclables), `image.ts` validation | Vitest |
| Integration | Insert/read logs against a Supabase test project; RLS: user A cannot read user B's rows | Vitest + supabase-js |
| End-to-end | Upload a fixture photo → see result → enter weight → totals update (mock the classifier worker for speed) | Playwright |
| AI accuracy | Spreadsheet of 50+ real photos: expected vs predicted, % correct per material. Re-run after changing labels/thresholds | Manual + small script |
| Device | Real iPhone + Android, poor lighting, cluttered background | Manual |

Target: ≥ 80% unit-test coverage on `src/lib/`; ≥ 80% top-1 accuracy on the photo set (top-3 should be higher, which the "Is it one of these?" screen uses).

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| AI misidentifies items | Curated label list, confidence thresholds, top-3 picker, manual correction always available |
| 100 MB model download on mobile data | Warn before the first scan; downloaded once, then cached. Open the app on Wi-Fi before a demo |
| Old / low-memory phones are slow or crash loading the model | Quantised model; material picker works without AI; consider a smaller model if needed |
| Users don't own a scale | Weight is optional; stretch: typical-weight defaults |
| Bin rules differ by location | Bin names/colours stored in the `materials` table, not hard-coded |
| Wrong recycling advice (e.g. greasy boxes, bags) | Include common "looks recyclable but isn't" items in the label list with tips |
| Free-tier limits (Supabase pauses inactive projects after ~1 week) | Use it regularly during development; un-pause from the dashboard before demos |
| Leaked keys | Only anon key in frontend, RLS on every table, `.env` git-ignored |

---

## 13. Decisions to make before Phase 0 ends

1. **Which bin system?** The example uses "Metal Recycling Bin", but this depends on where it'll be used. Examples:
   - Malaysia (3-bin): blue = paper, orange = plastic & aluminium/metal, brown = glass
   - Singapore: one blue bin for all recyclables
   - School/community drive: whatever bins you physically set up

   Fill `materials.bin_name` / `bin_colour` to match.
2. **Track non-recyclables too?** (Useful for awareness; must be excluded from "diverted" totals.)
3. **Individual or group totals?** Group totals suit a community-service project; needs a `groups` table and leaderboard (stretch).
4. **Deadline / demo date** → fix the phase dates in §9.
