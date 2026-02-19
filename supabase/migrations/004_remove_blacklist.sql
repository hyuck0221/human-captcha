-- Remove the validator blacklist from try_match().
-- The blacklist was preventing re-matching after a session ends.
-- The IN_PROGRESS partial unique index already prevents double-matching
-- while a session is active, so the blacklist is not needed.

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
