-- Preview seed for Bid Ladder Cloud (unpublished).
-- Idempotent: wipes prior seed+@bid-ladder.dev / [SEED] rows first.
-- 8 makers, 18 listings. Allocations $0–$170 so All-time and Today are populated.

DELETE FROM public.daily_rank_snapshots
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');
DELETE FROM public.today_rankings
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');
DELETE FROM public.rankings
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');
DELETE FROM public.daily_allocations
WHERE listing_id IN (SELECT id FROM public.listings WHERE description LIKE '[SEED]%');
DELETE FROM public.credit_ledger
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev')
   OR reason = 'preview seed';
DELETE FROM public.wallets
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev');
DELETE FROM public.listings WHERE description LIKE '[SEED]%';
DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev');
DELETE FROM auth.users WHERE email LIKE 'seed+%@bid-ladder.dev';

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT
  u.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  u.email,
  crypt('preview-seed-only-not-for-prod', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.display),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM (
  VALUES
    ('11111111-1111-4111-8111-111111111101'::uuid, 'seed+maker01@bid-ladder.dev', '[SEED] Maker 01'),
    ('11111111-1111-4111-8111-111111111102'::uuid, 'seed+maker02@bid-ladder.dev', '[SEED] Maker 02'),
    ('11111111-1111-4111-8111-111111111103'::uuid, 'seed+maker03@bid-ladder.dev', '[SEED] Maker 03'),
    ('11111111-1111-4111-8111-111111111104'::uuid, 'seed+maker04@bid-ladder.dev', '[SEED] Maker 04'),
    ('11111111-1111-4111-8111-111111111105'::uuid, 'seed+maker05@bid-ladder.dev', '[SEED] Maker 05'),
    ('11111111-1111-4111-8111-111111111106'::uuid, 'seed+maker06@bid-ladder.dev', '[SEED] Maker 06'),
    ('11111111-1111-4111-8111-111111111107'::uuid, 'seed+maker07@bid-ladder.dev', '[SEED] Maker 07'),
    ('11111111-1111-4111-8111-111111111108'::uuid, 'seed+maker08@bid-ladder.dev', '[SEED] Maker 08')
) AS u(id, email, display);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT
  u.id,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM (
  VALUES
    ('11111111-1111-4111-8111-111111111101'::uuid, 'seed+maker01@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111102'::uuid, 'seed+maker02@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111103'::uuid, 'seed+maker03@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111104'::uuid, 'seed+maker04@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111105'::uuid, 'seed+maker05@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111106'::uuid, 'seed+maker06@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111107'::uuid, 'seed+maker07@bid-ladder.dev'),
    ('11111111-1111-4111-8111-111111111108'::uuid, 'seed+maker08@bid-ladder.dev')
) AS u(id, email);

INSERT INTO public.listings (
  id, owner_id, category_id, name, tagline, url, description, slug, status, approved_at
)
SELECT
  l.id,
  l.owner_id,
  c.id,
  l.name,
  l.tagline,
  l.url,
  l.description,
  l.slug,
  'approved',
  now()
FROM (
  VALUES
    ('22222222-2222-4222-8222-222222222201'::uuid, '11111111-1111-4111-8111-111111111101'::uuid, 'agents', '[SEED] Northstar Agents', 'Autonomous ops agents for small teams.', 'https://seed.bid-ladder.dev/northstar', '[SEED] Preview listing. Wipe before publish.', 'seed-northstar-agents'),
    ('22222222-2222-4222-8222-222222222202'::uuid, '11111111-1111-4111-8111-111111111101'::uuid, 'business', '[SEED] Ledgerlift', 'Close books without the week-long scramble.', 'https://seed.bid-ladder.dev/ledgerlift', '[SEED] Preview listing. Wipe before publish.', 'seed-ledgerlift'),
    ('22222222-2222-4222-8222-222222222203'::uuid, '11111111-1111-4111-8111-111111111102'::uuid, 'seo', '[SEED] Rankkit SEO', 'Watch indexation without a 40-tab ritual.', 'https://seed.bid-ladder.dev/rankkit', '[SEED] Preview listing. Wipe before publish.', 'seed-rankkit-seo'),
    ('22222222-2222-4222-8222-222222222204'::uuid, '11111111-1111-4111-8111-111111111102'::uuid, 'marketing', '[SEED] Pulse Mail', 'Campaigns that stay inside one inbox.', 'https://seed.bid-ladder.dev/pulsemail', '[SEED] Preview listing. Wipe before publish.', 'seed-pulse-mail'),
    ('22222222-2222-4222-8222-222222222205'::uuid, '11111111-1111-4111-8111-111111111103'::uuid, 'developer', '[SEED] Stacklane', 'Ship internal tools on the same repo.', 'https://seed.bid-ladder.dev/stacklane', '[SEED] Preview listing. Wipe before publish.', 'seed-stacklane'),
    ('22222222-2222-4222-8222-222222222206'::uuid, '11111111-1111-4111-8111-111111111103'::uuid, 'productivity', '[SEED] Quiet Hours', 'Calendar blocks that actually hold.', 'https://seed.bid-ladder.dev/quiethours', '[SEED] Preview listing. Wipe before publish.', 'seed-quiet-hours'),
    ('22222222-2222-4222-8222-222222222207'::uuid, '11111111-1111-4111-8111-111111111104'::uuid, 'crypto', '[SEED] Coinrail', 'Treasury alerts without the noise.', 'https://seed.bid-ladder.dev/coinrail', '[SEED] Preview listing. Wipe before publish.', 'seed-coinrail'),
    ('22222222-2222-4222-8222-222222222208'::uuid, '11111111-1111-4111-8111-111111111104'::uuid, 'health', '[SEED] Clinicdesk', 'Front-desk ops for small clinics.', 'https://seed.bid-ladder.dev/clinicdesk', '[SEED] Preview listing. Wipe before publish.', 'seed-clinicdesk'),
    ('22222222-2222-4222-8222-222222222209'::uuid, '11111111-1111-4111-8111-111111111105'::uuid, 'design', '[SEED] Pixelyard', 'Design tokens that stay in sync.', 'https://seed.bid-ladder.dev/pixelyard', '[SEED] Preview listing. Wipe before publish.', 'seed-pixelyard'),
    ('22222222-2222-4222-8222-222222222210'::uuid, '11111111-1111-4111-8111-111111111105'::uuid, 'hiring', '[SEED] Hireloop', 'Take-home reviews without the spreadsheet.', 'https://seed.bid-ladder.dev/hireloop', '[SEED] Preview listing. Wipe before publish.', 'seed-hireloop'),
    ('22222222-2222-4222-8222-222222222211'::uuid, '11111111-1111-4111-8111-111111111106'::uuid, 'travel', '[SEED] Atlas Travel', 'Itineraries that survive timezone math.', 'https://seed.bid-ladder.dev/atlas', '[SEED] Preview listing. Wipe before publish.', 'seed-atlas-travel'),
    ('22222222-2222-4222-8222-222222222212'::uuid, '11111111-1111-4111-8111-111111111106'::uuid, 'ecommerce', '[SEED] Shopnest', 'Catalog ops for a one-person shop.', 'https://seed.bid-ladder.dev/shopnest', '[SEED] Preview listing. Wipe before publish.', 'seed-shopnest'),
    ('22222222-2222-4222-8222-222222222213'::uuid, '11111111-1111-4111-8111-111111111107'::uuid, 'writing', '[SEED] Notehorn', 'Long notes that stay searchable.', 'https://seed.bid-ladder.dev/notehorn', '[SEED] Preview listing. Wipe before publish.', 'seed-notehorn'),
    ('22222222-2222-4222-8222-222222222214'::uuid, '11111111-1111-4111-8111-111111111107'::uuid, 'audio', '[SEED] Waveform Audio', 'Show notes from the same take.', 'https://seed.bid-ladder.dev/waveform', '[SEED] Preview listing. Wipe before publish.', 'seed-waveform-audio'),
    ('22222222-2222-4222-8222-222222222215'::uuid, '11111111-1111-4111-8111-111111111108'::uuid, 'analytics', '[SEED] Daybreak Analytics', 'One number the team can argue about.', 'https://seed.bid-ladder.dev/daybreak', '[SEED] Preview listing. Wipe before publish.', 'seed-daybreak-analytics'),
    ('22222222-2222-4222-8222-222222222216'::uuid, '11111111-1111-4111-8111-111111111108'::uuid, 'education', '[SEED] Campuswire', 'Office hours that scale past 40 students.', 'https://seed.bid-ladder.dev/campuswire', '[SEED] Preview listing. Wipe before publish.', 'seed-campuswire'),
    ('22222222-2222-4222-8222-222222222217'::uuid, '11111111-1111-4111-8111-111111111108'::uuid, 'other', '[SEED] Otherbox', 'A catch-all that still looks finished.', 'https://seed.bid-ladder.dev/otherbox', '[SEED] Preview listing. Wipe before publish.', 'seed-otherbox'),
    ('22222222-2222-4222-8222-222222222218'::uuid, '11111111-1111-4111-8111-111111111107'::uuid, 'productivity', '[SEED] Draftshelf', 'Approved but unallocated — owner-only.', 'https://seed.bid-ladder.dev/draftshelf', '[SEED] Preview listing. Wipe before publish.', 'seed-draftshelf')
) AS l(id, owner_id, category_slug, name, tagline, url, description, slug)
JOIN public.categories c ON c.slug = l.category_slug;

SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111101', 30000, 'preview seed', 'seed-grant-01');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111102', 10000, 'preview seed', 'seed-grant-02');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111103', 8000, 'preview seed', 'seed-grant-03');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111104', 5000, 'preview seed', 'seed-grant-04');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111105', 4000, 'preview seed', 'seed-grant-05');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111106', 3000, 'preview seed', 'seed-grant-06');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111107', 4000, 'preview seed', 'seed-grant-07');
SELECT public.admin_grant_credits('11111111-1111-4111-8111-111111111108', 4000, 'preview seed', 'seed-grant-08');

SELECT public.set_allocation('22222222-2222-4222-8222-222222222201', 17000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222202', 8500);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222203', 4200);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222204', 3000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222205', 2500);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222206', 2000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222207', 1800);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222208', 1500);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222209', 1400);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222210', 1300);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222211', 1200);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222212', 1100);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222213', 1000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222214', 1000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222215', 1000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222216', 1000);
SELECT public.set_allocation('22222222-2222-4222-8222-222222222217', 1000);

-- All-time keeps the set_allocation totals. Today is shifted so the boards
-- do not look identical: Ledgerlift leads Today, Northstar stays All-time #1.
UPDATE public.daily_allocations
SET amount_cents = 8000
WHERE listing_id = '22222222-2222-4222-8222-222222222201'
  AND utc_date = (timezone('utc', now()))::date;

UPDATE public.daily_allocations
SET amount_cents = 2000
WHERE listing_id = '22222222-2222-4222-8222-222222222203'
  AND utc_date = (timezone('utc', now()))::date;

INSERT INTO public.daily_allocations (listing_id, utc_date, amount_cents, first_allocated_at)
VALUES
  ('22222222-2222-4222-8222-222222222202', (timezone('utc', now()))::date - 1, 9000, now() - interval '1 day'),
  ('22222222-2222-4222-8222-222222222201', (timezone('utc', now()))::date - 1, 4000, now() - interval '1 day' + interval '1 hour'),
  ('22222222-2222-4222-8222-222222222205', (timezone('utc', now()))::date - 1, 2500, now() - interval '1 day' + interval '2 hour')
ON CONFLICT (listing_id, utc_date) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  first_allocated_at = EXCLUDED.first_allocated_at;

INSERT INTO public.daily_rank_snapshots (
  utc_date, listing_id, rank, allocation_cents, unique_views, shares, frozen_at
)
VALUES
  ((timezone('utc', now()))::date - 1, '22222222-2222-4222-8222-222222222202', 1, 9000, 0, 0, ((timezone('utc', now()))::date)::timestamp AT TIME ZONE 'utc'),
  ((timezone('utc', now()))::date - 1, '22222222-2222-4222-8222-222222222201', 2, 4000, 0, 0, ((timezone('utc', now()))::date)::timestamp AT TIME ZONE 'utc'),
  ((timezone('utc', now()))::date - 1, '22222222-2222-4222-8222-222222222205', 3, 2500, 0, 0, ((timezone('utc', now()))::date)::timestamp AT TIME ZONE 'utc')
ON CONFLICT (utc_date, listing_id) DO UPDATE SET
  rank = EXCLUDED.rank,
  allocation_cents = EXCLUDED.allocation_cents,
  frozen_at = EXCLUDED.frozen_at;

SELECT public.recompute_rankings();
