-- StoryQuest Arena — Row Level Security policies
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor AFTER `npm run db:push` has created the
-- tables.
--
-- NOTE: The app talks to these tables through Prisma using the direct Postgres
-- connection, which bypasses RLS. These policies only matter if you also expose
-- the tables through the Supabase Data API (PostgREST) / client SDK. Enabling
-- them is good defense-in-depth.
--
-- Both guest (anonymous) and permanent users share the `authenticated` role;
-- rows are scoped by matching auth.uid() against the stored userId column.
-- ---------------------------------------------------------------------------

-- SearchQuery: users can only see and manage their own searches.
alter table "SearchQuery" enable row level security;

create policy "search_select_own"
  on "SearchQuery" for select
  using (auth.uid() = "userId");

create policy "search_insert_own"
  on "SearchQuery" for insert
  with check (auth.uid() = "userId");

create policy "search_delete_own"
  on "SearchQuery" for delete
  using (auth.uid() = "userId");

-- Topic: readable by everyone (public catalog); writes happen server-side only
-- (via the Prisma/service connection), so no client write policy is granted.
alter table "Topic" enable row level security;

create policy "topic_select_all"
  on "Topic" for select
  using (true);
