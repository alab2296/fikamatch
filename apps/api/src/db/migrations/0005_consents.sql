-- Append-only: every grant or withdrawal is a new row, the latest row per kind wins.
CREATE TABLE consents (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('terms', 'privacy', 'ai_processing')),
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX consents_user_kind_idx ON consents (user_id, kind, id DESC);
