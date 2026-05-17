CREATE OR REPLACE FUNCTION upsert_child_address(
  p_child_id uuid,
  p_street text,
  p_city text,
  p_state text,
  p_zip text,
  p_country text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership: the wishlist with this id must belong to the current user
  IF NOT EXISTS (
    SELECT 1 FROM wishlists w WHERE w.id = p_child_id AND w.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Upsert the address, encrypting street and zip
  INSERT INTO child_addresses (child_id, street, city, state, zip, country)
  VALUES (
    p_child_id,
    pgp_sym_encrypt(p_street, current_setting('app.encryption_key', true)),
    p_city,
    p_state,
    pgp_sym_encrypt(p_zip, current_setting('app.encryption_key', true)),
    p_country
  )
  ON CONFLICT (child_id) DO UPDATE SET
    street = pgp_sym_encrypt(p_street, current_setting('app.encryption_key', true)),
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip = pgp_sym_encrypt(p_zip, current_setting('app.encryption_key', true)),
    country = EXCLUDED.country,
    updated_at = now()
  WHERE child_addresses.child_id = p_child_id;

  -- Return the decrypted result
  SELECT json_build_object(
    'id', ca.id,
    'child_id', ca.child_id,
    'street', pgp_sym_decrypt(ca.street::bytea, current_setting('app.encryption_key', true)),
    'city', ca.city,
    'state', ca.state,
    'zip', pgp_sym_decrypt(ca.zip::bytea, current_setting('app.encryption_key', true)),
    'country', ca.country
  )
  INTO v_result
  FROM child_addresses ca
  WHERE ca.child_id = p_child_id;

  RETURN v_result;
END;
$$;
