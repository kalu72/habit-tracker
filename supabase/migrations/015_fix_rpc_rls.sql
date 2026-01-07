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

-- 2. Fix api_register (and move default setup here to avoid RLS race)
DROP FUNCTION IF EXISTS api_register(TEXT, TEXT);
CREATE OR REPLACE FUNCTION api_register(name_input TEXT, pin_hash_input TEXT)
RETURNS SETOF JSON AS $$
DECLARE
  new_user users;
BEGIN
  -- 1. Create the user
  INSERT INTO users (name, pin_hash)
  VALUES (name_input, pin_hash_input)
  RETURNING * INTO new_user;

  -- 2. Create default categories for the new user immediately
  -- We do this here as SECURITY DEFINER to bypass initial RLS "chicken-and-egg" issues
  INSERT INTO categories (user_id, name, color, icon)
  VALUES 
    (new_user.id, 'Personal Care', '#ec4899', '✨'),
    (new_user.id, 'Fitness', '#84cc16', '💪'),
    (new_user.id, 'Learning', '#3b82f6', '📚'),
    (new_user.id, 'Health', '#f97316', '❤️'),
    (new_user.id, 'Productivity', '#eab308', '⚡');
  
  -- 3. Return the user as JSON
  RETURN QUERY SELECT row_to_json(new_user);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are maintained
GRANT EXECUTE ON FUNCTION api_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_register(TEXT, TEXT) TO anon, authenticated;
