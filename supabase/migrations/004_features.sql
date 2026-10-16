-- Scan2Recycle: Malaysian bins, drop-off points (with suggestions) and groups / leaderboard.
-- Safe to re-run. Run in the Supabase SQL Editor (setup_all.sql includes this too).

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

notify pgrst, 'reload schema';
