CREATE EXTENSION IF NOT EXISTS postgis;

-- Only ever holds a point already snapped to the ~1 km grid, never an exact spot.
ALTER TABLE profiles ADD COLUMN location geography(Point, 4326);

CREATE INDEX profiles_location_idx ON profiles USING gist (location);
