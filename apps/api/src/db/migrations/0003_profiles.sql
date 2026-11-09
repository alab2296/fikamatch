-- Location column is added with the PostGIS item; only the city is stored for now.
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 500),
  gender text NOT NULL CHECK (gender IN ('woman', 'man', 'nonbinary', 'other')),
  looking_for text[] NOT NULL DEFAULT '{}'
    CHECK (looking_for <@ ARRAY['woman', 'man', 'nonbinary', 'other']),
  city_id smallint NOT NULL REFERENCES cities (id),
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_city_idx ON profiles (city_id);
