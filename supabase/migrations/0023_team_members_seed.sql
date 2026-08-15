-- ABAC website — seed team_members from the static Leadership page content.
--
-- Run this once in the Supabase Dashboard: SQL Editor → New query → paste →
-- Run. Requires 0016_team_members.sql to have been run first.
--
-- Why: app/team/page.tsx falls back to static content (content/team.ts,
-- content/founders.ts) only when a DB category is *empty*. The moment an
-- admin adds one executive member through /admin, that ternary flips to the
-- DB branch and the other eight static executives silently vanish from the
-- public page — a data-merge bug, not a display bug. The fix is to make the
-- database the real source of truth for every category from day one, so the
-- "thin DB" case this ternary was guarding against never actually happens.
-- Every insert below is guarded by `where not exists`, so re-running this
-- file is harmless.
--
-- Former Presidents needs an extra key beyond (name, category, role):
-- "Alu Passa" and "Dorji Tshering" each held the presidency in two different
-- (non-consecutive) terms, so name+category+role alone would collide on the
-- second insert — term_start disambiguates the repeat tenures.

alter table public.team_members
  add column if not exists is_founder boolean not null default false;

-- ---------------------------------------------------------------------------
-- Executive members (content/team.ts EXECUTIVE)
-- ---------------------------------------------------------------------------
insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Dorji Tashi', 'President', 'executive',
  'Mr Dorji Tashi is the President of ABAC, bringing diverse academic and professional experience from Bhutan, India, Japan, and Australia. He holds a Bachelor''s degree in Nursing Studies and a Master''s in Business from Australia. He is a social worker by heart and an entrepreneur by calling.',
  '/img/team/executive-member/dorji-tashi.jpeg', 0, true
where not exists (select 1 from public.team_members where name = 'Dorji Tashi' and category = 'executive' and role = 'President');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Jigme Jamtsho', 'Vice President & Public Relations Officer', 'executive',
  'Mr Jigme Jamtsho serves as Vice President and Public Relations Officer of ABAC. For many years, he has been dedicated to serving communities through compassionate leadership, collaboration, and volunteerism. From leading schools in Bhutan to supporting the Bhutanese community in Canberra, he believes true leadership is about empowering others and creating opportunities for everyone to thrive.',
  '/img/team/executive-member/jigme-jamtsho.jpeg', 1, true
where not exists (select 1 from public.team_members where name = 'Jigme Jamtsho' and category = 'executive' and role = 'Vice President & Public Relations Officer');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Kuenzang Dema', 'General Secretary', 'executive',
  'Ms Kuenzang Dema serves as General Secretary of ABAC. She holds a BA in International Development from Thailand and a Master of Social Work from Australia. With a strong background in social work, child protection, and community service, she supports the Association''s governance, administration, and member communication.',
  '/img/team/executive-member/kuenzang-dema.jpeg', 2, true
where not exists (select 1 from public.team_members where name = 'Kuenzang Dema' and category = 'executive' and role = 'General Secretary');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Tshering Phuntsho', 'Treasurer', 'executive',
  'Mr Tshering Phuntsho serves as Treasurer of ABAC. With experience in finance, accounting, and public service, he supports the Association''s financial management, accountability, and responsible stewardship of community funds.',
  '/img/team/executive-member/tshering-phuntsho.jpeg', 3, true
where not exists (select 1 from public.team_members where name = 'Tshering Phuntsho' and category = 'executive' and role = 'Treasurer');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Pema Yogini Yuphel', 'Community Engagement Officer', 'executive',
  'Ms Pema Yogini Yuphel serves as Community Engagement Officer of ABAC. She is recognised for her contribution to Bhutanese media and youth advocacy, and supports community connection, outreach, and participation.',
  '/img/team/executive-member/pema-yogini-yuphel.jpeg', 4, true
where not exists (select 1 from public.team_members where name = 'Pema Yogini Yuphel' and category = 'executive' and role = 'Community Engagement Officer');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Phuntsho Kinrab Dema', 'Community Engagement Officer', 'executive',
  'Ms Phuntsho Kinrab Dema serves as Community Engagement Officer of ABAC. She brings experience in media, communication, and public engagement, and supports community outreach, participation, and connection.',
  '/img/team/executive-member/phuntsho-kinrab-dema.jpeg', 5, true
where not exists (select 1 from public.team_members where name = 'Phuntsho Kinrab Dema' and category = 'executive' and role = 'Community Engagement Officer');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Tandin Sonam', 'Sports Coordinator', 'executive',
  'Mr Tandin Sonam serves as Sports Coordinator of ABAC. He is passionate about promoting sports, fitness, teamwork, and community wellbeing through inclusive sporting activities and events.',
  '/img/team/executive-member/tandin-sonam.jpeg', 6, true
where not exists (select 1 from public.team_members where name = 'Tandin Sonam' and category = 'executive' and role = 'Sports Coordinator');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Sangay Tshomo', 'Cultural Coordinator', 'executive',
  'Ms Sangay Tshomo serves as Cultural Coordinator of ABAC. She is dedicated to preserving and promoting Bhutanese culture and heritage, including traditional songs, dances, and cultural programs within the Canberra community.',
  '/img/team/executive-member/sangay-tshomo.jpeg', 7, true
where not exists (select 1 from public.team_members where name = 'Sangay Tshomo' and category = 'executive' and role = 'Cultural Coordinator');

insert into public.team_members (name, role, category, bio, photo_path, display_order, active)
select 'Leki Dorji', 'Youth and Technology Coordinator', 'executive',
  'Mr Leki Dorji serves as ABAC''s Youth and Technology Coordinator. He holds a Master of Data Science, specialising in Artificial Intelligence and Computational Modelling. He supports youth participation, digital innovation, leadership development, and community engagement within the Association.',
  '/img/team/executive-member/leki-dorji.jpeg', 8, true
where not exists (select 1 from public.team_members where name = 'Leki Dorji' and category = 'executive' and role = 'Youth and Technology Coordinator');

-- ---------------------------------------------------------------------------
-- Advisory board (content/team.ts ADVISORY_BOARD) — empty role strings kept
-- as '' to match the static content exactly (TeamPage renders `{p.role && ...}`,
-- so an empty role already displays as nothing today).
-- ---------------------------------------------------------------------------
insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Chencho Tshering', 'Chairperson', 'advisory', '/img/team/prez-chencho-tshering-2018-2019.jpg', 0, true
where not exists (select 1 from public.team_members where name = 'Chencho Tshering' and category = 'advisory' and role = 'Chairperson');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Kuenzang Dema', 'Member Secretary', 'advisory', '/img/team/executive-member/kuenzang-dema.jpeg', 1, true
where not exists (select 1 from public.team_members where name = 'Kuenzang Dema' and category = 'advisory' and role = 'Member Secretary');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Kezang Choden', '', 'advisory', '/img/team/advisory-board/kezang-choden.jpeg', 2, true
where not exists (select 1 from public.team_members where name = 'Kezang Choden' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Chencho Dorji', '', 'advisory', '/img/team/advisory-board/chencho-dorji.jpeg', 3, true
where not exists (select 1 from public.team_members where name = 'Chencho Dorji' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Leko', '', 'advisory', '/img/team/advisory-board/leko-portrait.jpeg', 4, true
where not exists (select 1 from public.team_members where name = 'Leko' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Dorji Tashi', 'ABAC President (ex officio member with voting right)', 'advisory', '/img/team/advisory-board/dorji-tashi.jpeg', 5, true
where not exists (select 1 from public.team_members where name = 'Dorji Tashi' and category = 'advisory' and role = 'ABAC President (ex officio member with voting right)');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Robin Rimal', '', 'advisory', '/img/team/advisory-board/robin-rimal.jpeg', 6, true
where not exists (select 1 from public.team_members where name = 'Robin Rimal' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Tsheten Dorji', '', 'advisory', '/img/team/advisory-board/tsheten-dorji.jpeg', 7, true
where not exists (select 1 from public.team_members where name = 'Tsheten Dorji' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Wangda Dorji', '', 'advisory', '/img/team/advisory-board/wangda-dorji.jpeg', 8, true
where not exists (select 1 from public.team_members where name = 'Wangda Dorji' and category = 'advisory' and role = '');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Migmar Dorji', '', 'advisory', '/img/team/advisory-board/migmar-dorji.jpeg', 9, true
where not exists (select 1 from public.team_members where name = 'Migmar Dorji' and category = 'advisory' and role = '');

-- ---------------------------------------------------------------------------
-- Founders (content/founders.ts FOUNDERS)
-- ---------------------------------------------------------------------------
insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Dasho Sonam Tobgay', 'Founder', 'founders', '/img/team/prez-sonam-tobgye-2010-2011.jpg', 0, true
where not exists (select 1 from public.team_members where name = 'Dasho Sonam Tobgay' and category = 'founders' and role = 'Founder');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Dr Lhawang Ugyel', 'Founder', 'founders', '/img/team/founder/lhawang-ugyel.jpeg', 1, true
where not exists (select 1 from public.team_members where name = 'Dr Lhawang Ugyel' and category = 'founders' and role = 'Founder');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Ms Patt Darlington', 'Founder', 'founders', '/img/team/founder/patt-darlington.jpeg', 2, true
where not exists (select 1 from public.team_members where name = 'Ms Patt Darlington' and category = 'founders' and role = 'Founder');

insert into public.team_members (name, role, category, photo_path, display_order, active)
select 'Mr Drukdra Wangchuk', 'Founder', 'founders', null, 3, true
where not exists (select 1 from public.team_members where name = 'Mr Drukdra Wangchuk' and category = 'founders' and role = 'Founder');

-- ---------------------------------------------------------------------------
-- Former presidents (content/team.ts FORMER_PRESIDENTS) — term_start/term_end
-- derived from each "YYYY-YYYY" tenure string so app/team/page.tsx can
-- reconstruct the exact same string for display. display_order follows the
-- array order in content/team.ts (most recent first), which FormerPresidents.tsx
-- then reverses for oldest-first display — same behaviour preserved via
-- ordering by term_start descending in the page's DB read path.
-- ---------------------------------------------------------------------------
insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Jigme Jamtsho', 'President', 'former_presidents', '/img/team/executive-member/jigme-jamtsho.jpeg', '2025-01-01', '2026-12-31', false, 0, true
where not exists (select 1 from public.team_members where name = 'Jigme Jamtsho' and category = 'former_presidents' and role = 'President' and term_start = '2025-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Ugyen Penjor', 'President', 'former_presidents', '/img/team/prez-ugyen-penjor-2024-2025.jpg', '2024-01-01', '2025-12-31', false, 1, true
where not exists (select 1 from public.team_members where name = 'Ugyen Penjor' and category = 'former_presidents' and role = 'President' and term_start = '2024-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Alu Passa', 'President', 'former_presidents', '/img/team/prez-alu-passa-2023-2024-2014-2015.jpg', '2023-01-01', '2024-12-31', false, 2, true
where not exists (select 1 from public.team_members where name = 'Alu Passa' and category = 'former_presidents' and role = 'President' and term_start = '2023-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Dorji Tshering', 'President', 'former_presidents', '/img/team/prez-dorji-tshering-2022-2023.jpg', '2022-01-01', '2023-12-31', false, 3, true
where not exists (select 1 from public.team_members where name = 'Dorji Tshering' and category = 'former_presidents' and role = 'President' and term_start = '2022-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Tshering Penjor', 'President', 'former_presidents', '/img/team/prez-tshering-penjor-2021-2022.jpg', '2021-01-01', '2022-12-31', false, 4, true
where not exists (select 1 from public.team_members where name = 'Tshering Penjor' and category = 'former_presidents' and role = 'President' and term_start = '2021-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Karma Drupchu', 'President', 'former_presidents', '/img/team/prez-karma-drupchu-2020-2021.jpg', '2020-01-01', '2021-12-31', false, 5, true
where not exists (select 1 from public.team_members where name = 'Karma Drupchu' and category = 'former_presidents' and role = 'President' and term_start = '2020-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Dorji Tshering', 'President', 'former_presidents', '/img/team/prez-dorji-tshering-2019-2020.jpg', '2019-01-01', '2020-12-31', false, 6, true
where not exists (select 1 from public.team_members where name = 'Dorji Tshering' and category = 'former_presidents' and role = 'President' and term_start = '2019-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Chencho Tshering', 'President', 'former_presidents', '/img/team/prez-chencho-tshering-2018-2019.jpg', '2018-01-01', '2019-12-31', false, 7, true
where not exists (select 1 from public.team_members where name = 'Chencho Tshering' and category = 'former_presidents' and role = 'President' and term_start = '2018-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Tashi Pelden', 'President', 'former_presidents', null, '2017-01-01', '2018-12-31', false, 8, true
where not exists (select 1 from public.team_members where name = 'Tashi Pelden' and category = 'former_presidents' and role = 'President' and term_start = '2017-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Tandin Dorji', 'President', 'former_presidents', '/img/team/prez-tandin-dorji-2016-2017.jpg', '2016-01-01', '2017-12-31', false, 9, true
where not exists (select 1 from public.team_members where name = 'Tandin Dorji' and category = 'former_presidents' and role = 'President' and term_start = '2016-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Namgyel Dorji', 'President', 'former_presidents', '/img/team/prez-namgyel-dorji-2015-2016.jpg', '2015-01-01', '2016-12-31', false, 10, true
where not exists (select 1 from public.team_members where name = 'Namgyel Dorji' and category = 'former_presidents' and role = 'President' and term_start = '2015-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Alu Passa', 'President', 'former_presidents', '/img/team/prez-alu-passa-2023-2024-2014-2015.jpg', '2014-01-01', '2015-12-31', false, 11, true
where not exists (select 1 from public.team_members where name = 'Alu Passa' and category = 'former_presidents' and role = 'President' and term_start = '2014-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Sonam Choden', 'President', 'former_presidents', '/img/team/prez-sonam-choden-2013-2014-square.jpg', '2013-01-01', '2014-12-31', false, 12, true
where not exists (select 1 from public.team_members where name = 'Sonam Choden' and category = 'former_presidents' and role = 'President' and term_start = '2013-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Ugyen Namgay', 'President', 'former_presidents', '/img/team/prez-ugyen-namgay-2012-2013.jpg', '2012-01-01', '2013-12-31', false, 13, true
where not exists (select 1 from public.team_members where name = 'Ugyen Namgay' and category = 'former_presidents' and role = 'President' and term_start = '2012-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Phub Dorji', 'President', 'former_presidents', '/img/team/prez-phub-dorji-2011-2012.jpg', '2011-01-01', '2012-12-31', false, 14, true
where not exists (select 1 from public.team_members where name = 'Phub Dorji' and category = 'former_presidents' and role = 'President' and term_start = '2011-01-01');

insert into public.team_members (name, role, category, photo_path, term_start, term_end, is_founder, display_order, active)
select 'Sonam Tobgye', 'President', 'former_presidents', '/img/team/prez-sonam-tobgye-2010-2011.jpg', '2010-01-01', '2011-12-31', true, 15, true
where not exists (select 1 from public.team_members where name = 'Sonam Tobgye' and category = 'former_presidents' and role = 'President' and term_start = '2010-01-01');
