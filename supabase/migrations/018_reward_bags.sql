-- =====================================================
-- Migration 018: Add Reward Bag Classification System
-- Two reward bags: 'baby' (small wins) and 'baller' (big wins)
-- =====================================================

-- PART 1: Add reward_bag column to rewards table
-- Existing rewards default to 'baller'
ALTER TABLE rewards ADD COLUMN reward_bag TEXT NOT NULL DEFAULT 'baller'
  CHECK (reward_bag IN ('baby', 'baller'));

-- PART 2: Add jackpot_bag column to habits table
-- Specifies which bag to pull from when reward_type = 'jackpot'
ALTER TABLE habits ADD COLUMN jackpot_bag TEXT DEFAULT 'baller'
  CHECK (jackpot_bag IN ('baby', 'baller'));

-- PART 3: Create index for efficient reward bag queries
CREATE INDEX idx_rewards_bag ON rewards(reward_bag) WHERE is_active = TRUE;

-- PART 4: Backfill existing jackpot habits to use 'baller' bag
UPDATE habits SET jackpot_bag = 'baller' WHERE reward_type = 'jackpot' AND jackpot_bag IS NULL;
