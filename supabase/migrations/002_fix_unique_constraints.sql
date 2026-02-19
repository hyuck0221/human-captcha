-- Fix: Replace full UNIQUE constraints with partial unique indexes
-- so that the same client/validator can be re-matched after a session ends.

-- Drop old full unique constraints
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_client_id_key;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_validator_id_key;

-- Add partial unique indexes: only one active (IN_PROGRESS) match per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS matches_client_id_active
  ON matches (client_id)
  WHERE status = 'IN_PROGRESS';

CREATE UNIQUE INDEX IF NOT EXISTS matches_validator_id_active
  ON matches (validator_id)
  WHERE status = 'IN_PROGRESS';
