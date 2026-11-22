# 12 - Preferences CRUD

Preferences say who a person wants to see: an age range and how far away.

1. `GET /preferences/me` returns your preferences, or 404 if you have not set any.
2. `PUT /preferences/me` creates or replaces them in one go.
3. The minimum age cannot be under 18, the minimum cannot be above the maximum, and the distance must be 1 to 500 km. Anything else gets a normal validation error.
4. Both routes need a valid access token, and the user id comes from the token, so nobody can read or change someone else's preferences.
