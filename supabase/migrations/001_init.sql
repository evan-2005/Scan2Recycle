-- Scan2Recycle initial schema.
-- Run in the Supabase dashboard (SQL Editor) or with `supabase db push`.

-- ---------------------------------------------------------------------------
-- Lookup tables (public, read-only for app users)
-- ---------------------------------------------------------------------------

-- Materials and the bin each one goes in. Bin names/colours are LOCAL: edit seed.sql to match your area.
create table public.materials (
  id            text primary key,
  display_name  text not null,
  bin_name      text not null,
  bin_colour    text not null check (bin_colour ~ '^#[0-9a-fA-F]{6}$'),
  is_recyclable boolean not null,
  sort_order    smallint not null default 0
);

-- Items the AI can recognise. `label` is the text the image model compares photos against ("a photo of <label>").
create table public.item_types (
  id               serial primary key,
  label            text not null unique check (char_length(label) between 2 and 80),
  display_name     text not null,
  material_id      text not null references public.materials (id),
  recyclable       boolean not null,
  typical_weight_g numeric check (typical_weight_g is null or typical_weight_g > 0),
  tip              text
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------

-- One row per scanned / logged item.
create table public.recycling_logs (
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

create index recycling_logs_user_created_idx on public.recycling_logs (user_id, created_at desc);

-- Per-user totals for the "My Recycling" screen.
-- security_invoker makes the view obey the RLS policies of recycling_logs.
create view public.user_totals with (security_invoker = true) as
select
  user_id,
  material_id,
  count(*)::int                         as items,
  round(coalesce(sum(weight_g), 0) / 1000.0, 3) as kg
from public.recycling_logs
group by user_id, material_id;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.materials      enable row level security;
alter table public.item_types     enable row level security;
alter table public.recycling_logs enable row level security;

-- Lookup tables: anyone can read, nobody can write from the app (edit via dashboard / migrations).
create policy "materials are readable by everyone"
  on public.materials for select using (true);

create policy "item types are readable by everyone"
  on public.item_types for select using (true);

-- Logs: each signed-in user (including anonymous sign-ins) sees and edits only their own rows.
create policy "users read own logs"
  on public.recycling_logs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users insert own logs"
  on public.recycling_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users update own logs"
  on public.recycling_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users delete own logs"
  on public.recycling_logs for delete to authenticated
  using ((select auth.uid()) = user_id);
