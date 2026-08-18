-- When the shutter fired, as opposed to when the file reached us.
--
-- The two differ by hours at a real event: guests shoot all evening and upload
-- in a batch the next morning, so `created_at` records the queue, not the
-- night. Only `taken_at` can order an album the way it actually happened.
--
-- This has to be captured at upload or not at all. The browser pipeline
-- re-encodes every photo through a canvas specifically to strip EXIF — that is
-- what keeps GPS coordinates out of a public bucket — and the shutter time is
-- destroyed in the same pass. `lib/exif.ts` lifts it out beforehand.
--
-- Nullable, and commonly null: screenshots, downloads, anything already through
-- a chat app, and many Android pickers carry no EXIF at all. Every reader must
-- fall back to `created_at` rather than treat null as an error.
--
-- No default. `now()` would be a lie with a plausible-looking value, which is
-- worse than an absent one — it would silently claim every legacy photo was
-- taken the moment it was uploaded.
alter table public.photos
  add column taken_at timestamptz;

comment on column public.photos.taken_at is
  'EXIF capture time, read in the browser before the canvas re-encode strips it. Null when the file carried none — fall back to created_at.';

-- No index. The only reader is the host ZIP export, which already loads a whole
-- album into memory to stream it and sorts there; an index on a few hundred
-- rows per event would cost writes on the upload path — the one path at a
-- wedding that is actually under load — and buy nothing.
