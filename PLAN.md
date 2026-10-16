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
 ┌──────────────────────────┐
 │  Phone browser / PWA     │   React + Vite, installable to home screen
 │  (camera, UI, charts)    │
 └─────┬──────────────┬─────┘
       │ image        │ save / read logs
       ▼              ▼
 ┌──────────────┐  ┌──────────────────────────┐
 │ Hugging Face │  │ Supabase                 │
 │ Space        │  │  • Postgres database     │
 │ (Gradio +    │  │  • Auth (anonymous/email)│
 │  CLIP model) │  │  • Row Level Security    │
 └──────────────┘  └──────────────────────────┘
```

**No custom backend server.** The app talks to two hosted services directly:
- **Hugging Face Space** — runs the image model, free CPU hardware, public endpoint, no API token in the app.
- **Supabase** — database + login. Row Level Security means each user can only read/write their own rows, so the public "anon key" is safe in the app.

This keeps the team on one codebase (the frontend) plus one small Python file (the Space).

---

## 3. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| App | **React + Vite + TypeScript**, built as a **PWA** | One codebase runs on iPhone, Android and laptop. Load on someone's phone by sending a link — no app store. |
| Styling | Tailwind CSS | Fast to build mobile layouts |
| Charts | Recharts | Simple bar chart for per-material totals |
| AI | **Hugging Face Space** (Gradio) running `openai/clip-vit-base-patch32` zero-shot classification | Free, uses Hugging Face, no credit limit, works with any list of item labels |
| AI client | `@gradio/client` (npm) | Official JS client for calling a Space |
| Database | **Supabase** (Postgres) free tier | Real SQL database, built-in auth, generous free tier |
| Hosting | Vercel or Netlify (free) | HTTPS URL is required for the phone camera + PWA install |
| Tests | Vitest (unit), Playwright (end-to-end) | |

### Why a Hugging Face *Space* instead of the Inference API?
Hugging Face's serverless "Inference Providers" API gives free accounts only about **$0.10/month of credits** (PRO is $9/mo for $2 of credits). A class demo with dozens of scans could burn through that. A Space you host yourself on free CPU hardware has no per-call cost.

| Option | Cost | Setup | Accuracy | Verdict |
|--------|------|-------|----------|---------|
| **A. Own HF Space + CLIP zero-shot** | Free | Medium (1 Python file) | Good for common items | **Primary** |
| B. HF Inference Providers + vision-language model (e.g. Qwen2.5-VL) returning JSON | ~$0.10/mo free, then paid | Easy | Best (can describe anything) | Backup / upgrade if you get credits |
| C. On-device with Transformers.js (CLIP in the browser) | Free, works offline | Medium | Same as A, slower first load (~150 MB model download) | Stretch: offline mode |

Free Spaces **go to sleep after ~48 h of no use** and take ~30–60 s to wake. Open the Space page a few minutes before any demo.

---

## 4. AI identification design

### 4.1 How it works
CLIP compares the photo against a list of text labels and returns a score for each. We give it a curated list of everyday items, each mapped to a material.

```
photo ──► CLIP ──► "a photo of an aluminium drink can"  0.81
                   "a photo of a tin food can"          0.09
                   "a photo of a plastic bottle"        0.04 ...
         top label ──► lookup table ──► { item, material, recyclable, bin }
```

### 4.2 Label → material table (lives in the database, `item_types`)
Start with ~30–40 items. Example rows:

| label (prompt text) | display name | material | recyclable | note |
|---|---|---|---|---|
| an aluminium drink can | Aluminium Can | metal | yes | Rinse first |
| a tin food can | Tin Can | metal | yes | Rinse first |
| a plastic water bottle | Plastic Bottle | plastic | yes | Remove cap if required locally |
| a plastic food container | Plastic Container | plastic | yes | Must be clean |
| a plastic bag | Plastic Bag | plastic | no* | *Often not accepted in bins — check locally |
| a styrofoam box | Styrofoam | plastic | no | |
| a cardboard box | Cardboard | paper | yes | Flatten |
| a newspaper | Newspaper | paper | yes | |
| a paper cup | Paper Cup | paper | no | Plastic lining |
| a greasy pizza box | Greasy Pizza Box | paper | no | Food contamination |
| a glass bottle | Glass Bottle | glass | yes | |
| a glass jar | Glass Jar | glass | yes | |
| a banana peel | Food Waste | organic | no | General / food waste |
| a battery | Battery | e-waste | no | Special e-waste drop-off |

Because the table is in the database, the team can add items without redeploying the AI.

### 4.3 Confidence rules
| Top score | App behaviour |
|-----------|---------------|
| ≥ 0.60 | Show result normally |
| 0.30 – 0.60 | Show top 3 guesses as buttons: "Is it one of these?" |
| < 0.30 | "Not sure — pick the material" (manual buttons) |

Thresholds are constants in one file; tune them during testing (§11).

### 4.4 Hugging Face Space code (`hf-space/app.py`)
```python
import gradio as gr
from transformers import pipeline

clf = pipeline("zero-shot-image-classification",
               model="openai/clip-vit-base-patch32")

def predict(image, labels_csv):
    labels = [l.strip() for l in labels_csv.split("|") if l.strip()]
    prompts = [f"a photo of {l}" for l in labels]
    results = clf(image, candidate_labels=prompts)
    return [{"label": r["label"].removeprefix("a photo of "),
             "score": round(r["score"], 4)} for r in results[:5]]

gr.Interface(fn=predict,
             inputs=[gr.Image(type="pil"), gr.Textbox()],
             outputs=gr.JSON(),
             api_name="predict").launch()
```
`requirements.txt`: `transformers`, `torch`, `gradio`, `pillow`.

The app sends the label list with each request (pulled from `item_types`), so the model never needs editing.

### 4.5 Calling it from the app (`src/lib/classify.ts`)
```ts
import { Client } from "@gradio/client";

export async function classify(image: Blob, labels: string[]) {
  const app = await Client.connect(import.meta.env.VITE_HF_SPACE_ID);
  const res = await app.predict("/predict", {
    image,
    labels_csv: labels.join("|"),
  });
  return res.data[0] as { label: string; score: number }[];
}
```
Before sending: resize the photo to max 512 px on the long side (faster upload, CLIP only uses 224 px anyway) and reject non-image files / files > 10 MB.

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
  label          text unique not null,     -- prompt text sent to CLIP
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
Do **not** store photos by default (privacy + storage limits). Only the AI result and weight are saved. If you later want photos for improving the label list, add an explicit opt-in and a Supabase Storage bucket.

---

## 6. Screens & user flow

```
[Home]  big "Scan item" button + this week's total
   │
   ▼
[Camera]  <input type="file" accept="image/*" capture="environment">
   │      (opens the rear camera on phones; gallery also allowed)
   ▼
[Analysing…]  spinner, "waking up AI" message if > 5 s (Space cold start)
   │
   ▼
[Result]  Detected: Aluminium Can
          Material: Metal   Recyclable: ✅ Yes
          ■ Place in Metal Recycling Bin   (colour chip)
          Tip: Rinse first
          [Wrong? Change]           ← manual correction
   │
   ▼
[Weight]  Weight (g): [ 32 ]   [Skip]   [Save]
   │
   ▼
[My Recycling]  Plastic 1.2 kg | Paper 2.4 kg | Metal 0.8 kg | Glass 0.6 kg
                Total 5.0 kg  + bar chart
                🌱 You've helped divert 5.0 kg of recyclable waste from general waste.
```

Bottom nav: **Scan · My Recycling · History**.

Non-recyclable result shows a red ❌ card with the reason and the right disposal (general waste / e-waste drop-off), and still lets the user log it if you want to track that too (decide in §13).

---

## 7. Project structure

```
scan2recycle/
├── hf-space/
│   ├── app.py
│   └── requirements.txt
├── supabase/
│   ├── migrations/001_init.sql      -- tables, view, RLS (§5)
│   └── seed.sql                     -- materials + item_types rows
├── web/
│   ├── index.html
│   ├── public/manifest.webmanifest  -- PWA name, icons, theme colour
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                  -- routes + bottom nav
│   │   ├── lib/
│   │   │   ├── supabase.ts          -- client init
│   │   │   ├── classify.ts          -- calls HF Space (§4.5)
│   │   │   ├── image.ts             -- resize/validate photo
│   │   │   ├── decide.ts            -- score → result/confidence rules (§4.3)
│   │   │   └── totals.ts            -- grams → kg, impact text
│   │   ├── features/
│   │   │   ├── scan/                -- ScanPage, ResultCard, CorrectionPicker
│   │   │   ├── log/                 -- WeightForm
│   │   │   ├── stats/               -- MyRecyclingPage, MaterialChart, ImpactBanner
│   │   │   └── history/             -- HistoryPage
│   │   └── types.ts
│   ├── tests/                       -- Vitest unit tests
│   ├── e2e/                         -- Playwright tests
│   ├── .env.example                 -- VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_HF_SPACE_ID
│   └── vite.config.ts               -- vite-plugin-pwa
└── README.md
```

Secrets: only the Supabase **anon** key and the public Space ID go in `.env`. Never put the Supabase `service_role` key or a Hugging Face token in the frontend. Add `.env` to `.gitignore`.

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
- [ ] Create GitHub repo, add everyone
- [ ] Create Supabase project, run `001_init.sql`
- [ ] Create Hugging Face account + Space (Gradio SDK, CPU basic)
- [ ] Scaffold `web/` with Vite React TS, Tailwind, vite-plugin-pwa
- [ ] Deploy empty app to Vercel → confirm the link opens on a phone
- [ ] **Decide local bin rules** (§13) and write `seed.sql`

### Phase 1 — AI working end to end (1 week)
- [ ] Deploy `app.py` to the Space; test in the Space's web UI with real photos
- [ ] `image.ts` resize/validate, `classify.ts`, `decide.ts`
- [ ] Scan page → Result card with hard-coded labels
- [ ] Load labels from `item_types` instead
- [ ] Collect 50+ test photos of real items (team's own photos) and record accuracy

### Phase 2 — Database & tracking (1 week)
- [ ] Anonymous auth on app start
- [ ] Weight form → insert into `recycling_logs`
- [ ] My Recycling page reading `user_totals` + chart + impact banner
- [ ] Manual correction flow (sets `was_corrected = true`)

### Phase 3 — Polish & phone (½–1 week)
- [ ] PWA icons, splash colour, "Add to Home Screen" instructions screen
- [ ] Loading / cold-start / offline / error messages
- [ ] History page with delete
- [ ] Accessibility pass: large tap targets, labels, colour + text (not colour alone) for bins
- [ ] Test on at least one iPhone and one Android

### Phase 4 — Stretch (if time)
- Typical weights, leaderboard, CO₂, Capacitor APK, offline Transformers.js

### Suggested roles
| Person | Owns |
|--------|------|
| A | HF Space, label list, accuracy testing |
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
| End-to-end | Upload a fixture photo → see result → enter weight → totals update (mock the Space for speed) | Playwright |
| AI accuracy | Spreadsheet of 50+ real photos: expected vs predicted, % correct per material. Re-run after changing labels/thresholds | Manual + small script |
| Device | Real iPhone + Android, poor lighting, cluttered background | Manual |

Target: ≥ 80% unit-test coverage on `src/lib/`; ≥ 80% top-1 accuracy on the photo set (top-3 should be higher, which the "Is it one of these?" screen uses).

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| AI misidentifies items | Curated label list, confidence thresholds, top-3 picker, manual correction always available |
| Space asleep during demo | Open it 5 min early; show "waking up AI…" message; option C (on-device) as backup |
| Space down / no internet | Fall back to manual material picker so logging still works |
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
