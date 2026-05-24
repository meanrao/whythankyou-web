-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: keep wishlist_items.claimed in sync with item_claims.
--
-- When a row is inserted into item_claims  → mark the parent item as claimed.
-- When all rows are deleted from item_claims for an item → unmark it.
--
-- This makes wishlist_items.claimed the reliable single source of truth the
-- app reads, while item_claims remains the authoritative record of who claimed
-- what (and is the source used by the public guest endpoint).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_item_claimed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.wishlist_items
    SET    claimed = TRUE
    WHERE  id = NEW.item_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Only unmark if no other claim rows exist for this item
    IF NOT EXISTS (
      SELECT 1 FROM public.item_claims WHERE item_id = OLD.item_id
    ) THEN
      UPDATE public.wishlist_items
      SET    claimed = FALSE
      WHERE  id = OLD.item_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_item_claimed ON public.item_claims;

CREATE TRIGGER trg_sync_item_claimed
  AFTER INSERT OR DELETE
  ON public.item_claims
  FOR EACH ROW
  EXECUTE FUNCTION sync_item_claimed();
