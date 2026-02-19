-- Fix 1: try_match() race condition
-- When both client and validator call try_match() simultaneously,
-- both lock different queue rows and try to INSERT the same match row.
-- The second INSERT fails with a unique_violation.
-- Fix: catch the exception and return null so the caller waits via Postgres Changes.
-- Also add a pre-check so users already in an active match don't create duplicates.

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
  v_blacklist      TEXT[];
  v_new_match      matches%ROWTYPE;
BEGIN
  -- Pre-check: already in an active match → return it
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

  -- Get caller's blacklist (clients only)
  IF p_role = 'client' THEN
    SELECT blacklisted_validators INTO v_blacklist
    FROM client_states WHERE user_id = p_user_id;
    IF v_blacklist IS NULL THEN
      v_blacklist := '{}';
    END IF;
  ELSE
    v_blacklist := '{}';
  END IF;

  -- Lock a partner row (non-blocking)
  IF p_role = 'client' THEN
    SELECT * INTO v_partner
    FROM queued_participants
    WHERE role = v_partner_role
      AND user_id <> p_user_id
      AND user_id <> ALL(v_blacklist)
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  ELSE
    SELECT q.* INTO v_partner
    FROM queued_participants q
    LEFT JOIN client_states cs ON cs.user_id = q.user_id
    WHERE q.role = v_partner_role
      AND q.user_id <> p_user_id
      AND (cs.blacklisted_validators IS NULL OR p_user_id <> ALL(cs.blacklisted_validators))
    ORDER BY q.joined_at ASC
    LIMIT 1
    FOR UPDATE OF q SKIP LOCKED;
  END IF;

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

  -- Insert match — catch race condition (both sides calling try_match simultaneously)
  BEGIN
    INSERT INTO matches (client_id, validator_id, client_language, validator_language)
    VALUES (v_client_id, v_validator_id, v_client_lang, v_validator_lang)
    RETURNING * INTO v_new_match;
  EXCEPTION WHEN unique_violation THEN
    -- Another concurrent try_match already created this match.
    -- Return null; the caller will receive the match via Postgres Changes subscription.
    RETURN;
  END;

  -- Update client blacklist
  INSERT INTO client_states (user_id, language, failures, blacklisted_validators, last_seen)
  VALUES (v_client_id, v_client_lang, 0, ARRAY[v_validator_id], NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET blacklisted_validators = array_append(
          COALESCE(client_states.blacklisted_validators, '{}'),
          v_validator_id
        ),
        last_seen = NOW();

  RETURN NEXT v_new_match;
END;
$$;
