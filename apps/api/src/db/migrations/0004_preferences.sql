CREATE TABLE preferences (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  min_age smallint NOT NULL DEFAULT 18 CHECK (min_age >= 18),
  max_age smallint NOT NULL DEFAULT 99 CHECK (max_age <= 120),
  max_distance_km smallint NOT NULL DEFAULT 25 CHECK (max_distance_km BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (min_age <= max_age)
);
