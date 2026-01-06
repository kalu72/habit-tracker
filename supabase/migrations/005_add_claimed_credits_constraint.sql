-- Add constraint to ensure claimed_credits is non-negative
ALTER TABLE users ADD CONSTRAINT claimed_credits_non_negative
  CHECK (claimed_credits >= 0);

-- Create function to atomically increment claimed_credits
CREATE OR REPLACE FUNCTION increment_claimed_credits(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  new_claimed INTEGER;
BEGIN
  UPDATE users
  SET claimed_credits = claimed_credits + 1
  WHERE id = user_id_param
  RETURNING claimed_credits INTO new_claimed;

  RETURN new_claimed;
END;
$$ LANGUAGE plpgsql;
