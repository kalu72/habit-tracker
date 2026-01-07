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
CREATE OR REPLACE FUNCTION api_register(name TEXT, pin_hash_input TEXT)
RETURNS SETOF JSON AS $$
DECLARE
  new_user users;
BEGIN
  -- 1. Create the user (use api_register.name to avoid ambiguity with column name)
  INSERT INTO users (name, pin_hash)
  VALUES (api_register.name, pin_hash_input)
  RETURNING * INTO new_user;

  -- 2. Create default categories for the new user immediately
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

-- 3. Clean up any existing duplicate PINs before adding constraint
-- (Keeps the oldest record for each PIN)
DELETE FROM users
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY pin_hash ORDER BY created_at ASC) as row_num
        FROM users
    ) t
    WHERE t.row_num > 1
);

-- 4. Ensure each PIN is unique to one account
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pin_hash_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_pin_hash_key UNIQUE (pin_hash);
    END IF;
END $$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION api_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_register(TEXT, TEXT) TO anon, authenticated;
