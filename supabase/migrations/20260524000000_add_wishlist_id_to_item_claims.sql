-- Fix: a trigger on item_claims references NEW.wishlist_id, but that column
-- was never created. Adding it (nullable FK) satisfies the trigger without
-- breaking existing rows. The edge function is also updated to populate it.

ALTER TABLE item_claims
  ADD COLUMN IF NOT EXISTS wishlist_id uuid
    REFERENCES wishlists(id) ON DELETE CASCADE;
