# Approximate location helpers

First half of the location item: plain functions, no database yet.

1. `approximate` snaps any coordinate to the middle of a roughly 1 km grid cell, so the exact spot is never stored.
2. `distanceKm` measures the distance between two points and rounds to whole kilometres.
3. Bad coordinates throw instead of being stored.

The PostGIS column and the profile wiring come in the next step.
