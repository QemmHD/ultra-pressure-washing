-- ============================================================
-- Ultra Pressure Washing — settings table migration
-- ============================================================
-- Run this ONCE in your Supabase project:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- It adds the columns the Admin panel needs to manage the homepage
-- headline, the Special Offer banner, and which services are shown.
-- Safe to run more than once (uses IF NOT EXISTS).
-- ============================================================

alter table settings add column if not exists hero_headline_line1 text;
alter table settings add column if not exists hero_headline_line2 text;
alter table settings add column if not exists offer_enabled boolean default true;
alter table settings add column if not exists offer_text text;
alter table settings add column if not exists hidden_services jsonb default '[]'::jsonb;

-- Seed sensible defaults on the existing settings row (id = 1).
update settings
set
  hero_headline_line1 = coalesce(hero_headline_line1, 'Spotless Results.'),
  hero_headline_line2 = coalesce(hero_headline_line2, '100% Ultra Clean.'),
  offer_enabled       = coalesce(offer_enabled, true),
  offer_text          = coalesce(offer_text, 'Get FREE Gutter Cleaning with any Roof and House Wash package!'),
  hidden_services     = coalesce(hidden_services, '[]'::jsonb)
where id = 1;
