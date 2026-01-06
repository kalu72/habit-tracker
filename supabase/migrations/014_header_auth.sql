-- =====================================================
-- Update RLS Auth to support Stateless Header
-- =====================================================

-- Redefine current_user_id to check for 'x-user-id' header
-- This allows stateless authentication via custom header, bypassing connection pooling issues

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
DECLARE
  header_id TEXT;
  session_id TEXT;
BEGIN
  -- 1. Try to get ID from standard Session variable (legacy/RPC method)
  session_id := NULLIF(current_setting('app.current_user_id', TRUE), '');
  
  IF session_id IS NOT NULL THEN
    RETURN session_id::UUID;
  END IF;

  -- 2. Try to get ID from Request Headers (x-user-id)
  -- request.headers is a JSON object provided by PostgREST
  header_id := current_setting('request.headers', TRUE)::json->>'x-user-id';
  
  IF header_id IS NOT NULL THEN
    -- Validate UUID format to prevent errors
    BEGIN
      RETURN header_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
