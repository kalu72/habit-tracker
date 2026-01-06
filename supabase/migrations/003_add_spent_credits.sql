-- Add spent_credits column to users table for the reward system
-- Users earn credits by completing habits (1 credit per 10 completions)
-- Credits are consumed when spinning the jackpot

ALTER TABLE users ADD COLUMN spent_credits INTEGER NOT NULL DEFAULT 0;

-- Add constraint to prevent negative spent_credits
ALTER TABLE users ADD CONSTRAINT spent_credits_non_negative CHECK (spent_credits >= 0);
