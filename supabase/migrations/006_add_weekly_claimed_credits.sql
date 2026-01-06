-- Add weekly claimed credits column
ALTER TABLE users ADD COLUMN IF NOT EXISTS claimed_credits_this_week INTEGER DEFAULT 0;

-- Add constraint
ALTER TABLE users ADD CONSTRAINT claimed_credits_this_week_non_negative
  CHECK (claimed_credits_this_week >= 0);

-- Update existing claimCredit function to increment both counters
CREATE OR REPLACE FUNCTION increment_claimed_credits_both(user_id_param UUID)
RETURNS TABLE(total_claimed INTEGER, weekly_claimed INTEGER) AS $$
BEGIN
  UPDATE users
  SET claimed_credits = claimed_credits + 1,
      claimed_credits_this_week = claimed_credits_this_week + 1
  WHERE id = user_id_param
  RETURNING claimed_credits, claimed_credits_this_week INTO total_claimed, weekly_claimed;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
