-- A trigger on item_claims references NEW.wishlist_id, but the column was never created.
-- This migration adds it (nullable FK) so the trigger no longer crashes on every insert.
-- The wishlist-api edge function is updated to populate it from wishlist_items.wishlist_id.

ALTER TABLE item_claims
  ADD COLUMN IF NOT EXISTS wishlist_id uuid
    REFERENCES wishlists(id) ON DELETE CASCADE;
