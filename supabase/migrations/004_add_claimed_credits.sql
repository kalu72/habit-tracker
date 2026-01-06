-- Add claimed_credits column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS claimed_credits INTEGER DEFAULT 0;
