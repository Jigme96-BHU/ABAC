-- ABAC website — update the "Mr Drukdra Wangchuk" founder record to his
-- correct title and add his photo.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0023_team_members_seed.sql to have been run first (that's
-- what created this row — the Leadership page reads founders from
-- team_members, not from content/founders.ts, whenever the DB category has
-- any rows; content/founders.ts is only the fallback for an empty category).
--
-- Matches on either the old or new name so this is safe to run more than
-- once (e.g. if it's re-pasted by mistake after already applying).
update public.team_members
set name = 'Lam Drukdra Wangchuk',
    photo_path = '/img/team/founder/drukdra-wangchuk.jpeg'
where category = 'founders'
  and role = 'Founder'
  and name in ('Mr Drukdra Wangchuk', 'Lam Drukdra Wangchuk');
