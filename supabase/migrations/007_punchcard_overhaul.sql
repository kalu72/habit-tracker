-- =====================================================
-- Habit Tracker Punchcard Overhaul Migration
-- =====================================================
-- This migration:
-- 1. Adds per-habit punchcard tracking fields
-- 2. Adds monthly scheduling support (e.g., "1st and 3rd Monday")
-- 3. Removes the global credit system
-- =====================================================

-- =====================================================
-- PART 1: Add punchcard fields to habits table
-- =====================================================

-- Enable punchcard tracking per habit
ALTER TABLE habits ADD COLUMN punchcard_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Target number of completions to fill the punchcard
ALTER TABLE habits ADD COLUMN punchcard_target INTEGER NOT NULL DEFAULT 10;

-- Reward type: 'direct' (specific reward text) or 'jackpot' (random from bag)
ALTER TABLE habits ADD COLUMN reward_type TEXT CHECK (reward_type IN ('direct', 'jackpot'));

-- For direct rewards: custom text defined on the habit
ALTER TABLE habits ADD COLUMN reward_text TEXT;

-- Current punch count (persistent, only resets on claim)
ALTER TABLE habits ADD COLUMN punchcard_current INTEGER NOT NULL DEFAULT 0;

-- Track when we last checked for new completions (for punch animation)
ALTER TABLE habits ADD COLUMN punchcard_last_checked TIMESTAMPTZ DEFAULT NOW();

-- Constraints
ALTER TABLE habits ADD CONSTRAINT punchcard_target_positive CHECK (punchcard_target > 0);
ALTER TABLE habits ADD CONSTRAINT punchcard_current_non_negative CHECK (punchcard_current >= 0);

-- =====================================================
-- PART 2: Add monthly scheduling fields
-- =====================================================

-- Which week occurrences in the month (e.g., [1, 3] for 1st and 3rd)
ALTER TABLE habits ADD COLUMN monthly_week_occurrences JSONB;

-- Which day of week for monthly habits (0=Sunday, 6=Saturday)
ALTER TABLE habits ADD COLUMN monthly_day_of_week INTEGER CHECK (monthly_day_of_week >= 0 AND monthly_day_of_week <= 6);

-- Update frequency_type CHECK constraint to include monthly_on_weeks
-- First, drop the existing constraint
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_frequency_type_check;

-- Add the new constraint with monthly_on_weeks
ALTER TABLE habits ADD CONSTRAINT habits_frequency_type_check
  CHECK (frequency_type IN ('daily', 'weekly', 'times_per_week', 'times_per_month', 'monthly_on_weeks'));

-- =====================================================
-- PART 3: Remove credit system from users table
-- =====================================================

-- Drop functions first (they depend on the columns)
DROP FUNCTION IF EXISTS increment_claimed_credits_both(UUID);
DROP FUNCTION IF EXISTS increment_spent_credits(UUID);

-- Drop constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS spent_credits_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS claimed_credits_non_negative;
ALTER TABLE users DROP CONSTRAINT IF EXISTS claimed_credits_this_week_non_negative;

-- Drop columns
ALTER TABLE users DROP COLUMN IF EXISTS spent_credits;
ALTER TABLE users DROP COLUMN IF EXISTS claimed_credits;
ALTER TABLE users DROP COLUMN IF EXISTS claimed_credits_this_week;

-- =====================================================
-- PART 4: Add punchcard helper functions
-- =====================================================

-- Increment punchcard punch count
CREATE OR REPLACE FUNCTION increment_punchcard(
  habit_id_param UUID,
  increment_by INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  new_value INTEGER;
BEGIN
  UPDATE habits
  SET punchcard_current = punchcard_current + increment_by
  WHERE id = habit_id_param
  RETURNING punchcard_current INTO new_value;

  RETURN new_value;
END;
$$ LANGUAGE plpgsql;

-- Reset punchcard after claiming reward
CREATE OR REPLACE FUNCTION reset_punchcard(habit_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE habits
  SET punchcard_current = 0,
      punchcard_last_checked = NOW()
  WHERE id = habit_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update last checked timestamp
CREATE OR REPLACE FUNCTION update_punchcard_last_checked(habit_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE habits
  SET punchcard_last_checked = NOW()
  WHERE id = habit_id_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 5: Add indexes for punchcard queries
-- =====================================================

-- Index for finding habits with punchcard enabled
CREATE INDEX idx_habits_punchcard_enabled ON habits(punchcard_enabled) WHERE punchcard_enabled = TRUE;

-- Index for reward lookups
CREATE INDEX idx_habits_reward_id ON habits(reward_id) WHERE reward_id IS NOT NULL;
