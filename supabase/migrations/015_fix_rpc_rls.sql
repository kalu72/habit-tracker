-- Migration: Fix Auth RPCs RLS Filtering
-- Purpose: Change api_login and api_register to return JSON instead of users table rows.
--          This prevents RLS from filtering the result before it reaches the client.

-- 1. Fix api_login
DROP FUNCTION IF EXISTS api_login(TEXT);
CREATE OR REPLACE FUNCTION api_login(pin_hash_input TEXT)
RETURNS SETOF JSON AS $$
BEGIN
  RETURN QUERY
  SELECT row_to_json(u)
  FROM users u
  WHERE pin_hash = pin_hash_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix api_register
DROP FUNCTION IF EXISTS api_register(TEXT, TEXT);
CREATE OR REPLACE FUNCTION api_register(name TEXT, pin_hash_input TEXT)
RETURNS SETOF JSON AS $$
BEGIN
  RETURN QUERY
  WITH inserted AS (
    INSERT INTO users (name, pin_hash)
    VALUES (name, pin_hash_input)
    RETURNING *
  )
  SELECT row_to_json(i) FROM inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are maintained
GRANT EXECUTE ON FUNCTION api_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_register(TEXT, TEXT) TO anon, authenticated;
