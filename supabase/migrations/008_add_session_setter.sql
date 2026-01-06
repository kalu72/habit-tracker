-- Migration: Add session setter function for RLS
-- Purpose: Create a function to set the app.current_user_id session variable
--          that the RLS policies depend on for user authentication

-- Function to set the session variable for RLS
CREATE OR REPLACE FUNCTION set_session_user(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Set the session variable that RLS policies check via current_user_id()
  -- The third parameter (false) makes this session-scoped, not transaction-scoped
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to allow clients to call this function
-- This is safe because the function only sets a session variable
GRANT EXECUTE ON FUNCTION set_session_user(UUID) TO anon, authenticated;
