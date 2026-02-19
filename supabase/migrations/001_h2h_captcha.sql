-- H2H Captcha: Supabase Schema + Functions
-- Run this in the Supabase SQL Editor

-- =========================================
-- TABLES
-- =========================================

CREATE TABLE IF NOT EXISTS queued_participants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL CHECK (role IN ('client', 'validator')),
  language   TEXT NOT NULL DEFAULT 'en',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queued_role_joined
  ON queued_participants (role, joined_at ASC);

CREATE TABLE IF NOT EXISTS client_states (
  user_id                 TEXT PRIMARY KEY,
  language                TEXT NOT NULL DEFAULT 'en',
  failures                INT NOT NULL DEFAULT 0,
  blacklisted_validators  TEXT[] NOT NULL DEFAULT '{}',
  last_seen               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          TEXT NOT NULL,
  validator_id       TEXT NOT NULL,
  client_language    TEXT NOT NULL DEFAULT 'en',
  validator_language TEXT NOT NULL DEFAULT 'en',
  task_type          TEXT NOT NULL DEFAULT 'MOUSE_TRACKING',
  status             TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ
);

-- Only one active (IN_PROGRESS) match per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS matches_client_id_active
  ON matches (client_id) WHERE status = 'IN_PROGRESS';

CREATE UNIQUE INDEX IF NOT EXISTS matches_validator_id_active
  ON matches (validator_id) WHERE status = 'IN_PROGRESS';

-- =========================================
-- ENABLE REALTIME
-- =========================================

-- Enable Realtime for the matches table so clients can subscribe to changes.
-- Also enable for queued_participants (optional, useful for debugging).
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE queued_participants;

-- =========================================
-- ROW LEVEL SECURITY
-- =========================================

ALTER TABLE queued_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anon to read/write queued_participants
CREATE POLICY "anon_all_queued" ON queued_participants
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anon to read/write client_states
CREATE POLICY "anon_all_client_states" ON client_states
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow anon to read matches (INSERT/UPDATE done via SECURITY DEFINER functions)
CREATE POLICY "anon_read_matches" ON matches
  FOR SELECT TO anon USING (true);

-- =========================================
-- RPC FUNCTIONS
-- =========================================

-- ------------------------------------------
-- try_match(p_user_id, p_role)
-- Atomically matches a client with a validator.
-- Returns the new match row on success, NULL on failure.
-- ------------------------------------------
CREATE OR REPLACE FUNCTION try_match(p_user_id TEXT, p_role TEXT)
RETURNS SETOF matches
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner        queued_participants%ROWTYPE;
  v_partner_role   TEXT;
  v_client_id      TEXT;
  v_validator_id   TEXT;
  v_client_lang    TEXT;
  v_validator_lang TEXT;
  v_new_match      matches%ROWTYPE;
BEGIN
  -- Pre-check: already in an active match → return it (idempotent)
  SELECT * INTO v_new_match
  FROM matches
  WHERE (client_id = p_user_id OR validator_id = p_user_id)
    AND status = 'IN_PROGRESS'
  LIMIT 1;

  IF v_new_match IS NOT NULL THEN
    RETURN NEXT v_new_match;
    RETURN;
  END IF;

  -- Determine partner role
  IF p_role = 'client' THEN
    v_partner_role := 'validator';
  ELSE
    v_partner_role := 'client';
  END IF;

  -- Lock a partner row (non-blocking)
  SELECT * INTO v_partner
  FROM queued_participants
  WHERE role = v_partner_role
    AND user_id <> p_user_id
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No partner available
  IF v_partner IS NULL THEN
    RETURN;
  END IF;

  -- Assign roles
  IF p_role = 'client' THEN
    v_client_id      := p_user_id;
    v_validator_id   := v_partner.user_id;
    SELECT language INTO v_client_lang FROM queued_participants WHERE user_id = p_user_id;
    v_validator_lang := v_partner.language;
  ELSE
    v_client_id      := v_partner.user_id;
    v_validator_id   := p_user_id;
    v_client_lang    := v_partner.language;
    SELECT language INTO v_validator_lang FROM queued_participants WHERE user_id = p_user_id;
  END IF;

  -- Remove both from queue
  DELETE FROM queued_participants WHERE user_id = v_client_id;
  DELETE FROM queued_participants WHERE user_id = v_validator_id;

  -- Insert match — handle race condition (both sides calling simultaneously)
  BEGIN
    INSERT INTO matches (client_id, validator_id, client_language, validator_language)
    VALUES (v_client_id, v_validator_id, v_client_lang, v_validator_lang)
    RETURNING * INTO v_new_match;
  EXCEPTION WHEN unique_violation THEN
    -- Another concurrent try_match already created this match.
    -- Return null; the caller will receive it via Postgres Changes subscription.
    RETURN;
  END;

  RETURN NEXT v_new_match;
END;
$$;

-- ------------------------------------------
-- record_decision(p_validator_id, p_approved)
-- Records validator's approve/reject verdict.
-- Returns { result: 'SUCCESS' | 'RETRY' | 'FAILED_FINAL', client_id }
-- ------------------------------------------
CREATE OR REPLACE FUNCTION record_decision(p_validator_id TEXT, p_approved BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match        matches%ROWTYPE;
  v_failures     INT;
  v_result       TEXT;
BEGIN
  -- Find the active match for this validator
  SELECT * INTO v_match
  FROM matches
  WHERE validator_id = p_validator_id
    AND status = 'IN_PROGRESS'
  LIMIT 1;

  IF v_match IS NULL THEN
    RETURN json_build_object('error', 'No active match found');
  END IF;

  -- Mark match as ended
  UPDATE matches
  SET status   = CASE WHEN p_approved THEN 'SUCCESS' ELSE 'FAIL' END,
      ended_at = NOW()
  WHERE id = v_match.id;

  IF p_approved THEN
    -- On success: clear client state
    DELETE FROM client_states WHERE user_id = v_match.client_id;
    v_result := 'SUCCESS';
  ELSE
    -- On failure: increment failure count
    INSERT INTO client_states (user_id, language, failures, blacklisted_validators, last_seen)
    VALUES (v_match.client_id, v_match.client_language, 1, ARRAY[p_validator_id], NOW())
    ON CONFLICT (user_id) DO UPDATE
      SET failures  = client_states.failures + 1,
          last_seen = NOW()
    RETURNING failures INTO v_failures;

    -- If the INSERT path ran (no conflict), failures = 1
    IF v_failures IS NULL THEN
      SELECT failures INTO v_failures
      FROM client_states WHERE user_id = v_match.client_id;
    END IF;

    IF v_failures >= 3 THEN
      v_result := 'FAILED_FINAL';
    ELSE
      v_result := 'RETRY';
    END IF;
  END IF;

  RETURN json_build_object(
    'result',    v_result,
    'client_id', v_match.client_id
  );
END;
$$;

-- ------------------------------------------
-- handle_disconnect(p_user_id)
-- Cleans up queued entry and any active match on disconnect.
-- Returns { partner_id } so the frontend can broadcast to the partner.
-- ------------------------------------------
CREATE OR REPLACE FUNCTION handle_disconnect(p_user_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match      matches%ROWTYPE;
  v_partner_id TEXT;
BEGIN
  -- Remove from queue (if still queued)
  DELETE FROM queued_participants WHERE user_id = p_user_id;

  -- Find active match
  SELECT * INTO v_match
  FROM matches
  WHERE (client_id = p_user_id OR validator_id = p_user_id)
    AND status = 'IN_PROGRESS'
  LIMIT 1;

  IF v_match IS NOT NULL THEN
    -- End the match
    UPDATE matches
    SET status   = 'DISCONNECTED',
        ended_at = NOW()
    WHERE id = v_match.id;

    -- Determine partner
    IF v_match.client_id = p_user_id THEN
      v_partner_id := v_match.validator_id;
    ELSE
      v_partner_id := v_match.client_id;
    END IF;
  END IF;

  RETURN json_build_object('partner_id', v_partner_id);
END;
$$;

-- =========================================
-- GRANT EXECUTE ON RPC FUNCTIONS TO ANON
-- =========================================

GRANT EXECUTE ON FUNCTION try_match(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION record_decision(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION handle_disconnect(TEXT) TO anon;
