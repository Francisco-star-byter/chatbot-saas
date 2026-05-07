-- Migration 002: Atomic usage increment function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_conversation_count(p_client_id UUID, p_month DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO usage (client_id, month, conversation_count)
  VALUES (p_client_id, p_month, 1)
  ON CONFLICT (client_id, month)
  DO UPDATE SET conversation_count = usage.conversation_count + 1;
END;
$$ LANGUAGE plpgsql;
