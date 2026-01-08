-- Migration: Harden Auth Logic
-- Purpose: Make current_user_id() more robust by adding safer JSON parsing
--          and ensuring it always returns NULL instead of throwing on malformed input.

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
DECLARE
  header_id TEXT;
  session_id TEXT;
  raw_headers TEXT;
BEGIN
  -- 1. Try to get ID from standard Session variable (legacy/RPC method)
  -- This is set via set_session_user() RPC
  session_id := NULLIF(current_setting('app.current_user_id', TRUE), '');
  
  IF session_id IS NOT NULL THEN
    BEGIN
      RETURN session_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      -- Fall through if session_id is not a valid UUID
    END;
  END IF;

  -- 2. Try to get ID from Request Headers (x-user-id)
  -- request.headers is a JSON string provided by PostgREST
  raw_headers := current_setting('request.headers', TRUE);
  
  IF raw_headers IS NOT NULL AND raw_headers <> '' THEN
    BEGIN
      header_id := raw_headers::json->>'x-user-id';
      
      IF header_id IS NOT NULL AND header_id <> '' THEN
        RETURN header_id::UUID;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Fall through if header parsing fails
    END;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION current_user_id() TO anon, authenticated;
