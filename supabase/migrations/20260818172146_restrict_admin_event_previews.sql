-- Supabase's default privileges grant function execution directly to `anon`
-- as well as through PUBLIC. The original migration revoked PUBLIC only,
-- which kept the data safe through RLS (anon received an empty result) but
-- still exposed an admin-only endpoint unnecessarily.
revoke all on function public.owned_events_with_previews() from anon;
