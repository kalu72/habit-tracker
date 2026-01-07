-- Migration: Fix Auth RPCs RLS Filtering
-- Purpose: Change api_login and api_register to return JSON instead of users table rows.
--          This prevents RLS from filtering the result before it reaches the client.

-- 1. Fix api_login
DROP FUNCTION IF EXISTS api_login(TEXT);
CREATE OR REPLACE FUNCTION api_login(pin_hash_input TEXT)
RETURNS TABLE(usr_id UUID, usr_name TEXT, usr_created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.created_at
  FROM users u
  WHERE u.pin_hash = pin_hash_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix api_register
DROP FUNCTION IF EXISTS api_register(TEXT, TEXT);
CREATE OR REPLACE FUNCTION api_register(name TEXT, pin_hash_input TEXT)
RETURNS TABLE(usr_id UUID, usr_name TEXT, usr_created_at TIMESTAMPTZ) AS $$
DECLARE
  new_user users;
BEGIN
  -- 1. Create the user
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
    (new_user.id, 'Productivity', '#eab308', '⚡')
  ON CONFLICT DO NOTHING;
  
  -- 3. Return the user structure
  RETURN QUERY SELECT new_user.id, new_user.name, new_user.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up any existing duplicate PINs
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

-- 4. Ensure each PIN is unique
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pin_hash_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_pin_hash_key UNIQUE (pin_hash);
    END IF;
END $$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION api_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_register(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_session_user(UUID) TO anon, authenticated;
