-- Migration: Secure Database (RLS & RPCs)
-- Purpose: 
-- 1. Enable RLS on all tables to prevent unauthorized access.
-- 2. Create secure RPC functions for authentication (login/register) that bypass RLS safely.
-- 3. Define strict policies so users can only access their own data.

-- =====================================================
-- PART 1: Secure RPC Functions for Auth
-- =====================================================

-- Secure Login: Check PIN hash and return user if match
CREATE OR REPLACE FUNCTION api_login(pin_hash_input TEXT)
RETURNS SETOF users AS $$
BEGIN
  -- This function is SECURITY DEFINER, so it runs with the creator's permissions
  -- bypassing RLS. This allows it to "search" the users table.
  RETURN QUERY
  SELECT *
  FROM users
  WHERE pin_hash = pin_hash_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure Register: Create new user
CREATE OR REPLACE FUNCTION api_register(name TEXT, pin_hash_input TEXT)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  INSERT INTO users (name, pin_hash)
  VALUES (name, pin_hash_input)
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check if any users exist (for onboarding)
CREATE OR REPLACE FUNCTION api_has_any_users()
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT count(*) INTO user_count FROM users;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to these functions for everyone (public)
GRANT EXECUTE ON FUNCTION api_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_register(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION api_has_any_users() TO anon, authenticated;


-- =====================================================
-- PART 2: Enable RLS and Clean Up
-- =====================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE punchcards ENABLE ROW LEVEL SECURITY;

-- Drop generic/permissive policies if they exist to be clean
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "categories_all" ON categories;
DROP POLICY IF EXISTS "habits_all" ON habits;
DROP POLICY IF EXISTS "completions_all" ON habit_completions;
DROP POLICY IF EXISTS "rewards_all" ON rewards;
DROP POLICY IF EXISTS "punchcards_all" ON punchcards;

-- Drop any potentially "public" or "anon" policies that might have been created
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for all users" ON users;
DROP POLICY IF EXISTS "Enable all access for all users" ON users;


-- =====================================================
-- PART 3: Define Strict RLS Policies
-- =====================================================
-- Note: These rely on `current_user_id()` function defined in 001_initial_schema.sql
--       which reads the `app.current_user_id` session variable.

-- Users: Can only read/update THEIR OWN record
-- (We do NOT allow INSERT here directly anymore, must use api_register)
CREATE POLICY "users_self_manage" ON users
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- Categories: Full access to OWN categories
CREATE POLICY "categories_self_manage" ON categories
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Habits: Full access to OWN habits
CREATE POLICY "habits_self_manage" ON habits
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Habit Completions: Access only via OWN habits
-- Note: Subqueries can be expensive in RLS, but for this scale it's fine.
-- A more performant way is to denormalize user_id to this table, but for now we follow schema.
-- Actually, let's keep it safe. If performance issue arises, we add user_id to completions.
CREATE POLICY "completions_self_manage" ON habit_completions
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_completions.habit_id
      AND habits.user_id = current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_completions.habit_id
      AND habits.user_id = current_user_id()
    )
  );

-- Rewards: Full access to OWN rewards
CREATE POLICY "rewards_self_manage" ON rewards
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- Punchcards: Full access to OWN punchcards
CREATE POLICY "punchcards_self_manage" ON punchcards
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

