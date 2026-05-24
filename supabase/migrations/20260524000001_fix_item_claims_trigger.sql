-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: triggers on item_claims reference NEW.wishlist_id, but that column does
-- not exist in item_claims (columns: id, item_id, claimer_name, claimer_email,
-- created_at).  This script:
--   1. Inspects every trigger + function on item_claims
--   2. Patches any function body that reads NEW.wishlist_id — replaces it with
--      a subquery that derives the value through item_id → wishlist_items
--   3. Inspects + fixes RLS policies that may reference wishlist_id
--   4. Runs a smoke-test insert and immediately rolls it back
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. INSPECT: triggers ─────────────────────────────────────────────────────
SELECT
  tg.tgname                                                    AS trigger_name,
  CASE WHEN (tg.tgtype & 2) <> 0 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  p.proname                                                    AS function_name,
  pg_get_functiondef(p.oid)                                    AS function_body
FROM  pg_trigger tg
JOIN  pg_class  c ON c.oid  = tg.tgrelid
JOIN  pg_proc   p ON p.oid  = tg.tgfoid
WHERE c.relname  = 'item_claims'
  AND NOT tg.tgisinternal;

-- ── 2. INSPECT: RLS policies ─────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM  pg_policies
WHERE tablename = 'item_claims';

-- ── 3. FIX: patch every trigger function that reads NEW.wishlist_id ───────────
DO $$
DECLARE
  rec        RECORD;
  fixed_def  TEXT;
  n          INT := 0;
BEGIN
  FOR rec IN
    SELECT DISTINCT p.proname AS fname, pg_get_functiondef(p.oid) AS fdef
    FROM  pg_trigger tg
    JOIN  pg_class  c ON c.oid = tg.tgrelid
    JOIN  pg_proc   p ON p.oid = tg.tgfoid
    WHERE c.relname = 'item_claims'
      AND NOT tg.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%NEW.wishlist_id%'
  LOOP
    n := n + 1;
    RAISE NOTICE 'Patching trigger function: %', rec.fname;

    -- Replace every occurrence of NEW.wishlist_id with a subquery that joins
    -- through wishlist_items so no extra column is needed on item_claims.
    fixed_def := replace(
      rec.fdef,
      'NEW.wishlist_id',
      '(SELECT wishlist_id FROM public.wishlist_items WHERE id = NEW.item_id)'
    );

    EXECUTE fixed_def;
    RAISE NOTICE '  → done';
  END LOOP;

  IF n = 0 THEN
    RAISE NOTICE 'No trigger functions referencing NEW.wishlist_id found — trigger may already be clean.';
  ELSE
    RAISE NOTICE 'Patched % function(s).', n;
  END IF;
END $$;

-- ── 4. SMOKE TEST: verify a direct insert no longer triggers the crash ────────
BEGIN;

INSERT INTO item_claims (item_id, claimer_name, claimer_email)
SELECT id, '_smoke_test_', 'smoke@example.com'
FROM   wishlist_items
LIMIT  1
RETURNING id, item_id, claimer_name;

ROLLBACK;  -- always roll back — this is just a test
