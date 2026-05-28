-- Creates the share_tokens table used to generate shareable guest links for wishlists.
-- The edge function (wishlist-api) writes to this table via the service-role client,
-- which bypasses RLS. The anon client needs SELECT to load the guest view.

CREATE TABLE IF NOT EXISTS share_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT share_tokens_wishlist_id_key UNIQUE (wishlist_id),
  CONSTRAINT share_tokens_token_key       UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS share_tokens_token_idx ON share_tokens (token);

ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated guests) can look up a token to view the list.
-- Writes are handled exclusively by the service-role edge function (bypasses RLS).
CREATE POLICY "share_tokens_public_select"
  ON share_tokens
  FOR SELECT
  USING (true);
