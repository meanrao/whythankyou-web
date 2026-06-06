-- Add sort_order for custom drag-and-drop ordering of wishlist items.
-- New items default to 0; existing rows are backfilled with sequential
-- numbers (0-based) per wishlist ordered by creation time.

ALTER TABLE wishlist_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE wishlist_items wi
SET sort_order = sub.rn - 1
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY wishlist_id ORDER BY created_at ASC) AS rn
  FROM wishlist_items
) sub
WHERE wi.id = sub.id;

CREATE INDEX IF NOT EXISTS wishlist_items_sort_order_idx
  ON wishlist_items (wishlist_id, sort_order);
