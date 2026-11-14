# 11 - Profile CRUD

Until now the profile only existed as a table. This step lets a signed-in person manage their own.

1. `GET /profile/me` returns your profile, or 404 if you have not made one yet.
2. `PUT /profile/me` creates it or replaces its fields. Name, gender and city are required; the bio is optional.
3. Repeated values in "looking for" are collapsed, and a city that does not exist gives a normal validation error.
4. `DELETE /profile/me` removes the row for real and answers 204.
5. Every route needs a valid access token, and you can only ever reach your own profile because the id comes from the token, never from the URL.
