# Cities table and seed

A small migration (`0002_cities.sql`) adds the `cities` table and fills it with Stockholm, Göteborg, Malmö and Uppsala.

1. Each city has a short slug, a display name, the country (SE) and a centre point as latitude and longitude.
2. Slugs are unique and coordinates are range-checked.
3. The centre is plain numbers for now. The PostGIS item later swaps this for a proper geography column.

The test checks the four seeded rows and that bad rows are refused.
