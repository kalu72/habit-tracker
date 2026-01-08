-- Migration: Case-Insensitive RLS Auth
-- Purpose: Make current_user_id() robust against header casing changes
--          (e.g., x-user-id vs X-User-Id) which vary by browser/proxy.

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
DECLARE
  header_id TEXT;
  session_id TEXT;
  raw_headers TEXT;
  headers_json JSON;
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

  -- 2. Try to get ID from Request Headers (case-insensitive)
  -- request.headers is a JSON string provided by PostgREST
  raw_headers := current_setting('request.headers', TRUE);
  
  IF raw_headers IS NOT NULL AND raw_headers <> '' THEN
    BEGIN
      headers_json := raw_headers::json;
      
      -- Find x-user-id key case-insensitively
      SELECT value INTO header_id
      FROM json_each_text(headers_json)
      WHERE lower(key) = 'x-user-id'
      LIMIT 1;
      
      IF header_id IS NOT NULL AND header_id <> '' THEN
        RETURN header_id::UUID;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Fall through if header parsing fails
    END;
  END IF;

  -- 3. Fallback to auth.uid() if standard Supabase Auth is ever used
  BEGIN
    header_id := current_setting('auth.uid', TRUE);
    IF header_id IS NOT NULL AND header_id <> '' THEN
      RETURN header_id::UUID;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fall through
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION current_user_id() TO anon, authenticated;
