-- Centre points are plain coordinates for now; PostGIS arrives with the location item.
CREATE TABLE cities (
  id smallint PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'SE',
  centre_lat double precision NOT NULL CHECK (centre_lat BETWEEN -90 AND 90),
  centre_lon double precision NOT NULL CHECK (centre_lon BETWEEN -180 AND 180)
);

INSERT INTO cities (id, slug, name, centre_lat, centre_lon) VALUES
  (1, 'stockholm', 'Stockholm', 59.3293, 18.0686),
  (2, 'gothenburg', 'Göteborg', 57.7089, 11.9746),
  (3, 'malmo', 'Malmö', 55.6050, 13.0038),
  (4, 'uppsala', 'Uppsala', 59.8586, 17.6389);
