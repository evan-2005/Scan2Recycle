-- Scan2Recycle: ONE-FILE SETUP for the Supabase SQL Editor.
-- Same result as running migrations/001_init.sql + migrations/002_grants.sql + seed.sql,
-- but safe to run more than once (it skips or updates anything that already exists).
-- Your logged items in recycling_logs are never deleted.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.materials (
  id            text primary key,
  display_name  text not null,
  bin_name      text not null,
  bin_colour    text not null check (bin_colour ~ '^#[0-9a-fA-F]{6}$'),
  is_recyclable boolean not null,
  sort_order    smallint not null default 0
);

create table if not exists public.item_types (
  id               serial primary key,
  label            text not null unique check (char_length(label) between 2 and 80),
  display_name     text not null,
  material_id      text not null references public.materials (id),
  recyclable       boolean not null,
  typical_weight_g numeric check (typical_weight_g is null or typical_weight_g > 0),
  tip              text
);

create table if not exists public.recycling_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_type_id  int references public.item_types (id) on delete set null,
  material_id   text not null references public.materials (id),
  weight_g      numeric check (weight_g is null or (weight_g > 0 and weight_g < 50000)),
  ai_label      text check (ai_label is null or char_length(ai_label) <= 80),
  ai_score      numeric check (ai_score is null or (ai_score >= 0 and ai_score <= 1)),
  was_corrected boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists recycling_logs_user_created_idx
  on public.recycling_logs (user_id, created_at desc);

create or replace view public.user_totals with (security_invoker = true) as
select
  user_id,
  material_id,
  count(*)::int                                 as items,
  round(coalesce(sum(weight_g), 0) / 1000.0, 3) as kg
from public.recycling_logs
group by user_id, material_id;

-- ---------------------------------------------------------------------------
-- Row Level Security (each user only sees their own logs)
-- ---------------------------------------------------------------------------

alter table public.materials      enable row level security;
alter table public.item_types     enable row level security;
alter table public.recycling_logs enable row level security;

drop policy if exists "materials are readable by everyone" on public.materials;
create policy "materials are readable by everyone"
  on public.materials for select using (true);

drop policy if exists "item types are readable by everyone" on public.item_types;
create policy "item types are readable by everyone"
  on public.item_types for select using (true);

drop policy if exists "users read own logs" on public.recycling_logs;
create policy "users read own logs"
  on public.recycling_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users insert own logs" on public.recycling_logs;
create policy "users insert own logs"
  on public.recycling_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users update own logs" on public.recycling_logs;
create policy "users update own logs"
  on public.recycling_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own logs" on public.recycling_logs;
create policy "users delete own logs"
  on public.recycling_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Data API access
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.materials, public.item_types to anon, authenticated;
grant select, insert, update, delete on public.recycling_logs to authenticated;
grant select on public.user_totals to authenticated;

-- ---------------------------------------------------------------------------
-- Starter data (bin names/colours are PLACEHOLDERS: see seed.sql)
-- ---------------------------------------------------------------------------

insert into public.materials (id, display_name, bin_name, bin_colour, is_recyclable, sort_order) values
  ('plastic', 'Plastic',     'Plastic Recycling Bin', '#f28c28', true,  1),
  ('paper',   'Paper',       'Paper Recycling Bin',   '#2f6fb5', true,  2),
  ('metal',   'Metal',       'Metal Recycling Bin',   '#e6b800', true,  3),
  ('glass',   'Glass',       'Glass Recycling Bin',   '#7a5230', true,  4),
  ('organic', 'Food waste',  'Food Waste / General Waste', '#5b7d3a', false, 5),
  ('e-waste', 'E-waste',     'E-waste Drop-off Point',     '#b3412e', false, 6),
  ('general', 'General waste', 'General Waste Bin',        '#4a4a4a', false, 7)
on conflict (id) do update set
  display_name  = excluded.display_name,
  bin_name      = excluded.bin_name,
  bin_colour    = excluded.bin_colour,
  is_recyclable = excluded.is_recyclable,
  sort_order    = excluded.sort_order;

-- Labels are what CLIP compares the photo against ("a photo of <label>").
-- typical_weight_g is left null on purpose: weigh real samples before filling it in.
-- `recyclable` is per item, so e.g. a greasy pizza box is paper but not recyclable.
insert into public.item_types (label, display_name, material_id, recyclable, tip) values
  -- Metal
  ('an aluminium drink can',        'Aluminium Can',        'metal',   true,  'Empty and rinse. No need to crush.'),
  ('a tin food can',                'Tin Can',              'metal',   true,  'Rinse out food. Lids can go in too.'),
  ('an aerosol spray can',          'Aerosol Can',          'metal',   true,  'Only if completely empty. Do not pierce.'),
  ('aluminium foil',                'Aluminium Foil',       'metal',   true,  'Must be clean. Scrunch into a ball.'),
  ('a metal bottle cap',            'Bottle Cap',           'metal',   true,  'Small items can get lost; put several in a can.'),
  -- Plastic
  ('a plastic water bottle',        'Plastic Bottle',       'plastic', true,  'Empty and rinse. Check if caps are accepted locally.'),
  ('a plastic milk jug',            'Plastic Milk Jug',     'plastic', true,  'Rinse out milk.'),
  ('a plastic food container',      'Plastic Container',    'plastic', true,  'Must be clean of food.'),
  ('a plastic detergent bottle',    'Detergent Bottle',     'plastic', true,  'Rinse and replace the cap.'),
  ('a plastic cup',                 'Plastic Cup',          'plastic', true,  'Rinse first.'),
  ('a plastic shopping bag',        'Plastic Bag',          'plastic', false, 'Usually not accepted in recycling bins. Reuse it or use a store drop-off.'),
  ('a styrofoam food box',          'Styrofoam',            'general', false, 'Polystyrene foam is rarely recyclable. General waste.'),
  ('a chip packet',                 'Snack Packet',         'general', false, 'Multi-layer foil/plastic. General waste.'),
  ('a plastic straw',               'Plastic Straw',        'general', false, 'Too small to sort. General waste.'),
  -- Paper
  ('a cardboard box',               'Cardboard Box',        'paper',   true,  'Flatten it. Remove tape if you can.'),
  ('a newspaper',                   'Newspaper',            'paper',   true,  'Keep dry.'),
  ('a magazine',                    'Magazine',             'paper',   true,  'Keep dry.'),
  ('a sheet of office paper',       'Paper',                'paper',   true,  'Staples are fine.'),
  ('a paper bag',                   'Paper Bag',            'paper',   true,  'Must be clean and dry.'),
  ('an egg carton',                 'Egg Carton',           'paper',   true,  'Paper cartons only, not foam.'),
  ('a drink carton',                'Drink Carton',         'paper',   true,  'Rinse and flatten. Check local rules for cartons.'),
  ('a disposable paper cup',        'Paper Cup',            'paper',   false, 'Plastic lining makes it hard to recycle. General waste.'),
  ('a greasy pizza box',            'Greasy Pizza Box',     'paper',   false, 'Food and grease contaminate paper. Tear off clean parts to recycle.'),
  ('a used tissue',                 'Tissue',               'general', false, 'Used tissues are not recyclable.'),
  -- Glass
  ('a glass bottle',                'Glass Bottle',         'glass',   true,  'Empty and rinse. Remove the cap.'),
  ('a glass jar',                   'Glass Jar',            'glass',   true,  'Rinse out food. Remove the lid.'),
  ('a drinking glass',              'Drinking Glass',       'general', false, 'Drinking glasses melt differently from bottles. Wrap and put in general waste.'),
  ('a ceramic mug',                 'Ceramic Mug',          'general', false, 'Ceramics are not glass. General waste.'),
  -- Food
  ('a banana peel',                 'Fruit Peel',           'organic', false, 'Food waste. Compost if you can.'),
  ('leftover food',                 'Leftover Food',        'organic', false, 'Food waste. Compost if you can.'),
  -- E-waste
  ('a battery',                     'Battery',              'e-waste', false, 'Never put batteries in bins. Take to an e-waste drop-off.'),
  ('a mobile phone',                'Mobile Phone',         'e-waste', false, 'Take to an e-waste drop-off. Wipe your data first.'),
  ('a phone charger cable',         'Cable',                'e-waste', false, 'Take to an e-waste drop-off.'),
  ('a light bulb',                  'Light Bulb',           'e-waste', false, 'Take to an e-waste or lighting drop-off.'),
  -- Added after first phone tests (Oct 2026)
  ('a shampoo bottle',              'Shampoo Bottle',       'plastic', true,  'Rinse it out and put the cap back on.'),
  ('a yoghurt cup',                 'Yoghurt Cup',          'plastic', true,  'Scrape out and rinse.'),
  ('a squeeze tube of lotion or toothpaste', 'Squeeze Tube', 'plastic', false, 'Most tubes are multi-layer plastic and are not accepted. General waste unless your area takes them.'),
  ('plastic cling film',            'Cling Film',           'general', false, 'Soft film plastic is not accepted in recycling bins.'),
  ('a plastic toy',                 'Toy',                  'general', false, 'If it still works, donate it. Otherwise general waste.'),
  ('a toothbrush',                  'Toothbrush',           'general', false, 'Mixed materials. General waste.'),
  ('a disposable face mask',        'Face Mask',            'general', false, 'General waste. Cut the ear loops first.'),
  ('a pen',                         'Pen',                  'general', false, 'Mixed materials. General waste.'),
  ('plastic cutlery',               'Plastic Cutlery',      'general', false, 'Too small and mixed to recycle. General waste.'),
  ('a cereal box',                  'Cereal Box',           'paper',   true,  'Flatten it. Take out the plastic bag inside.'),
  ('a toilet paper roll tube',      'Toilet Roll Tube',     'paper',   true,  'Flatten it.'),
  ('an envelope',                   'Envelope',             'paper',   true,  'Window envelopes are usually fine.'),
  ('an aluminium food tray',        'Aluminium Tray',       'metal',   true,  'Clean off food first.'),
  ('a wine bottle',                 'Wine Bottle',          'glass',   true,  'Empty and rinse. Remove the cork or cap.'),
  ('old clothes',                   'Clothing',             'general', false, 'Donate wearable clothes, or use a textile recycling bin if there is one.'),
  ('earphones',                     'Earphones',            'e-waste', false, 'Take to an e-waste drop-off.')
on conflict (label) do update set
  display_name = excluded.display_name,
  material_id  = excluded.material_id,
  recyclable   = excluded.recyclable,
  tip          = excluded.tip;

-- Make the API pick up the tables right away.
notify pgrst, 'reload schema';

-- Final check: should show 3 rows (materials 7, item_types 50, recycling_logs = your logs).
select 'materials' as table_name, count(*) as rows from public.materials
union all select 'item_types', count(*) from public.item_types
union all select 'recycling_logs', count(*) from public.recycling_logs;
