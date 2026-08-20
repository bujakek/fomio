-- Roles: `user` (everyone) and `admin` (unlimited access).
--
-- Until now the only authorization concept was `events.owner_id`, which is
-- ownership scoping and nothing else: a signed-in host reaches exactly their
-- own rows and there is no way to reach anyone else's. That is the right
-- default and it stays the default. What it does not give you is an operator
-- — somebody who can look at a broken album, export it for a host who cannot,
-- or run an event without paying for it.
--
-- So: a role on a profile row, and one `is_admin()` predicate OR'd into the
-- existing ownership policies. The ownership rule is untouched for everyone
-- who is not an admin, which keeps the blast radius of this migration to a
-- single boolean.
--
-- This is NOT the multi-tenant dashboard CLAUDE.md rules out. There is no
-- tenant switching, no per-client branding, no sharing — one row knows whether
-- the account is the operator's.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('user', 'admin');

-- One row per auth user, created by a trigger rather than by application code.
-- Signup happens inside Supabase Auth (the magic link creates the user), so
-- there is no point in our request path where we could reliably insert it —
-- `/auth/callback` runs after the user already exists and would leave a gap
-- for anyone who abandons the callback.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user role. Rows are created by the on_auth_user_created trigger; role is only writable by an admin or the service role.';

alter table public.profiles enable row level security;

-- Supabase grants table privileges to anon and authenticated by default, and
-- RLS is what actually stops anon here. Revoking as well is defence in depth:
-- guests have no business holding any privilege on this table, and it keeps
-- an accidentally-added permissive policy from becoming a public endpoint.
revoke all on public.profiles from anon;

-- ---------------------------------------------------------------------------
-- is_admin()
-- ---------------------------------------------------------------------------

-- Security definer for the same reason event_accepts_uploads() is: policy
-- expressions are evaluated as the invoking role. An inline
-- `exists (select 1 from public.profiles …)` inside profiles' own policy would
-- be filtered by that policy and recurse; inside events' policy it would be
-- filtered by profiles' policy and evaluate false for anyone whose read of
-- their own row happened to be denied. Reading the role has to bypass RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------

-- Read your own row, or every row if you are an admin.
create policy "users read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Deliberately no self-update policy. A user may read their role and may not
-- write it — otherwise `role = 'admin'` is one PATCH away for anyone holding
-- the anon key and a session, which is everyone. Promotion happens through an
-- admin, or through the SQL editor with the service role for the first one.
create policy "admins manage profiles"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Backfill and trigger
-- ---------------------------------------------------------------------------

insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `on conflict do nothing` because the backfill above and this trigger can
  -- both be true for a user created while the migration is running.
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin bypass on the existing ownership policies
-- ---------------------------------------------------------------------------
--
-- Each of these is the policy that already existed with `or public.is_admin()`
-- added. Postgres has no "alter policy expression" that would let us do this
-- in place, so drop-and-recreate is the only form available; the bodies are
-- otherwise unchanged from 20260813133341 and 20260818171000.
--
-- Consequence worth knowing before you promote an account: because
-- owned_events_with_previews() is SECURITY INVOKER and leans on these policies,
-- /admin will list *every* event in the system for an admin, not just theirs.
-- That is the point, but it is a surprising first login.

drop policy "host manages own events" on public.events;
create policy "host manages own events"
  on public.events for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy "host manages photos in own events" on public.photos;
create policy "host manages photos in own events"
  on public.photos for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = photos.event_id and e.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = photos.event_id and e.owner_id = auth.uid()
    )
  );

-- Note the bucket check stays outside the OR. "Unlimited access to everything"
-- means every album in this product, not every object in the project — an
-- admin session must not become a general-purpose key to buckets this app
-- never created.
drop policy "host manages objects in own events" on storage.objects;
create policy "host manages objects in own events"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'event-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select e.id::text from public.events e where e.owner_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'event-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] in (
        select e.id::text from public.events e where e.owner_id = auth.uid()
      )
    )
  );
