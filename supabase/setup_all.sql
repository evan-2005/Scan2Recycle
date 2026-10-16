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
  ('plastic', 'Plastic',       'Orange recycling bin (plastic & metal)', '#f28c28', true,  1),
  ('paper',   'Paper',         'Blue recycling bin (paper)',             '#2f6fb5', true,  2),
  ('metal',   'Metal',         'Orange recycling bin (plastic & metal)', '#f28c28', true,  3),
  ('glass',   'Glass',         'Brown recycling bin (glass)',            '#7a5230', true,  4),
  ('organic', 'Food waste',    'Food waste / general waste bin',         '#5b7d3a', false, 5),
  ('e-waste', 'E-waste',       'E-waste drop-off point',                 '#b3412e', false, 6),
  ('general', 'General waste', 'General waste bin',                      '#4a4a4a', false, 7)
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

-- ===== Features (same as migrations/004_features.sql) =====
-- ---------------------------------------------------------------------------
-- 1. Malaysia's 3-colour public recycling bins (blue paper, orange plastic & metal, brown glass).
--    Check with your local council (e.g. SWCorp / DBKL) if your area differs.
-- ---------------------------------------------------------------------------

insert into public.materials (id, display_name, bin_name, bin_colour, is_recyclable, sort_order) values
  ('plastic', 'Plastic',       'Orange recycling bin (plastic & metal)', '#f28c28', true,  1),
  ('paper',   'Paper',         'Blue recycling bin (paper)',             '#2f6fb5', true,  2),
  ('metal',   'Metal',         'Orange recycling bin (plastic & metal)', '#f28c28', true,  3),
  ('glass',   'Glass',         'Brown recycling bin (glass)',            '#7a5230', true,  4),
  ('organic', 'Food waste',    'Food waste / general waste bin',         '#5b7d3a', false, 5),
  ('e-waste', 'E-waste',       'E-waste drop-off point',                 '#b3412e', false, 6),
  ('general', 'General waste', 'General waste bin',                      '#4a4a4a', false, 7)
on conflict (id) do update set
  display_name  = excluded.display_name,
  bin_name      = excluded.bin_name,
  bin_colour    = excluded.bin_colour,
  is_recyclable = excluded.is_recyclable,
  sort_order    = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 2. Drop-off points added by the team or suggested by users.
--    Suggestions stay hidden (approved = false) until the team ticks "approved" in the Table Editor.
-- ---------------------------------------------------------------------------

create table if not exists public.recycling_points (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(btrim(name)) between 2 and 120),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  materials     text[] not null default '{}'
                check (materials <@ array['paper', 'plastic', 'metal', 'glass', 'e-waste', 'clothes', 'organic']::text[]),
  address       text check (address is null or char_length(address) <= 200),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 120),
  notes         text check (notes is null or char_length(notes) <= 300),
  approved      boolean not null default false,
  suggested_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists recycling_points_approved_idx on public.recycling_points (approved);

alter table public.recycling_points enable row level security;

drop policy if exists "approved points are public, own suggestions visible" on public.recycling_points;
create policy "approved points are public, own suggestions visible"
  on public.recycling_points for select
  using (approved or suggested_by = (select auth.uid()));

drop policy if exists "signed-in users can suggest points" on public.recycling_points;
create policy "signed-in users can suggest points"
  on public.recycling_points for insert to authenticated
  with check (approved = false and suggested_by = (select auth.uid()));

-- At most 10 suggestions per user per day, so the approval queue can't be flooded.
create or replace function public.limit_point_suggestions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.recycling_points
      where suggested_by = new.suggested_by and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can suggest up to 10 points a day.';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_point_suggestions on public.recycling_points;
create trigger limit_point_suggestions before insert on public.recycling_points
  for each row when (new.approved = false) execute function public.limit_point_suggestions();

grant select on public.recycling_points to anon, authenticated;
grant insert on public.recycling_points to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Groups and leaderboard.
--    Members only see each other's display names and totals, never emails or ids.
--    All changes go through the functions below; there is no direct write access.
-- ---------------------------------------------------------------------------

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 60),
  join_code  text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "members can see their groups" on public.groups;
create policy "members can see their groups"
  on public.groups for select to authenticated
  using (exists (select 1 from public.group_members m where m.group_id = groups.id and m.user_id = (select auth.uid())));

drop policy if exists "users see their own memberships" on public.group_members;
create policy "users see their own memberships"
  on public.group_members for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.groups, public.group_members to authenticated;

create or replace function public.require_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  return uid;
end;
$$;

create or replace function public.clean_display_name(p_display_name text) returns text
language plpgsql immutable as $$
declare cleaned text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(cleaned) not between 1 and 30 then raise exception 'Display name must be 1 to 30 characters.'; end if;
  return cleaned;
end;
$$;

create or replace function public.create_group(p_name text, p_display_name text)
returns table (id uuid, name text, join_code text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := public.require_user();
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I, easy to read aloud
  code text;
  new_id uuid;
begin
  if (select count(*) from public.group_members m where m.user_id = uid) >= 10 then
    raise exception 'You can be in up to 10 groups.';
  end if;
  loop
    code := (select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.groups g where g.join_code = code);
  end loop;
  insert into public.groups (name, join_code, created_by)
    values (btrim(p_name), code, uid) returning groups.id into new_id;
  insert into public.group_members (group_id, user_id, display_name)
    values (new_id, uid, public.clean_display_name(p_display_name));
  return query select g.id, g.name, g.join_code from public.groups g where g.id = new_id;
end;
$$;

create or replace function public.join_group(p_code text, p_display_name text)
returns table (id uuid, name text, join_code text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  uid uuid := public.require_user();
  target uuid;
begin
  select g.id into target from public.groups g where g.join_code = upper(btrim(p_code));
  if target is null then raise exception 'No group has that code. Check it and try again.'; end if;
  if not exists (select 1 from public.group_members m where m.group_id = target and m.user_id = uid)
     and (select count(*) from public.group_members m where m.user_id = uid) >= 10 then
    raise exception 'You can be in up to 10 groups.';
  end if;
  insert into public.group_members (group_id, user_id, display_name)
    values (target, uid, public.clean_display_name(p_display_name))
    on conflict (group_id, user_id) do update set display_name = excluded.display_name;
  return query select g.id, g.name, g.join_code from public.groups g where g.id = target;
end;
$$;

create or replace function public.leave_group(p_group_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.require_user();
begin
  delete from public.group_members m where m.group_id = p_group_id and m.user_id = uid;
  -- Remove a group once its last member leaves.
  delete from public.groups g where g.id = p_group_id
    and not exists (select 1 from public.group_members m where m.group_id = p_group_id);
end;
$$;

-- Ranking for one group: all-time and last-7-days totals of recyclable items, members only.
create or replace function public.group_leaderboard(p_group_id uuid)
returns table (display_name text, items bigint, kg numeric, kg_this_week numeric, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := public.require_user();
begin
  if not exists (select 1 from public.group_members m where m.group_id = p_group_id and m.user_id = uid) then
    raise exception 'You are not in this group.';
  end if;
  return query
    select
      m.display_name,
      count(l.id) as items,
      round(coalesce(sum(l.weight_g), 0) / 1000.0, 3) as kg,
      round(coalesce(sum(l.weight_g) filter (where l.created_at > now() - interval '7 days'), 0) / 1000.0, 3) as kg_this_week,
      m.user_id = uid as is_me
    from public.group_members m
    left join public.recycling_logs l
      on l.user_id = m.user_id
     and l.material_id in (select mat.id from public.materials mat where mat.is_recyclable)
    where m.group_id = p_group_id
    group by m.user_id, m.display_name
    order by 3 desc, 2 desc, 1; -- kg, items, name
end;
$$;

revoke execute on function public.require_user(), public.clean_display_name(text),
  public.create_group(text, text), public.join_group(text, text),
  public.leave_group(uuid), public.group_leaderboard(uuid) from public, anon;
grant execute on function public.create_group(text, text), public.join_group(text, text),
  public.leave_group(uuid), public.group_leaderboard(uuid) to authenticated;
grant execute on function public.require_user(), public.clean_display_name(text) to authenticated;

-- Make the API pick up the tables right away.
notify pgrst, 'reload schema';

-- Final check: should show 3 rows (materials 7, item_types 50, recycling_logs = your logs).
select 'materials' as table_name, count(*) as rows from public.materials
union all select 'item_types', count(*) from public.item_types
union all select 'recycling_logs', count(*) from public.recycling_logs;
