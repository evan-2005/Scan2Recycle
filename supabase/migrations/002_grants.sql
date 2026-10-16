-- Explicit Data API grants. Newer Supabase projects can be set to not expose new tables
-- automatically; these grants make the app's access explicit either way.
-- Row Level Security from 001_init.sql still decides which rows each user can see.

grant usage on schema public to anon, authenticated;

grant select on public.materials, public.item_types to anon, authenticated;
grant select, insert, update, delete on public.recycling_logs to authenticated;
grant select on public.user_totals to authenticated;

-- Tell the API to reload its table list now instead of waiting.
notify pgrst, 'reload schema';
