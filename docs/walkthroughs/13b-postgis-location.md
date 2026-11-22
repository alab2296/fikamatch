# 13 - Location in PostGIS

The rounding helpers from step 13a now meet the database.

1. A migration turns on PostGIS and adds a `location` column to profiles, with a spatial index.
2. `PUT /profile/me/location` takes a latitude and longitude, snaps it to the roughly 1 km grid on the server, and stores only the snapped point. The exact spot never reaches the database.
3. The answer is an empty 204. Coordinates are never sent back to anyone.
4. `DELETE /profile/me/location` really clears it.
5. Two helpers will serve the feed later: distance between two users in whole kilometres, and "who is within N km", nearest first.
