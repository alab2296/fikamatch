CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- deferred so a whole reorder can be applied in one statement
  UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED
);
