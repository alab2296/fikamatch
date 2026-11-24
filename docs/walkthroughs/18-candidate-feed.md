# 18 - Candidate feed

`GET /feed` answers "who could I be shown next?". It needs a sign-in and a profile.

Someone is shown only if all of this is true:

1. They are not you, not banned, not blocked by you or blocking you, and you have not swiped on them before.
2. Genders fit both ways. Your "looking for" must include their gender and theirs must include yours. An empty list means open to anyone.
3. Ages fit both ways. They are inside your age range and you are inside theirs. Without saved preferences the range is 18 to 99.
4. Distance: if you have shared an approximate location, they must have one too and be within your distance (default 25 km). If you have not, only people in your city are shown.

The nearest people come first, and ties are broken by id so the order is stable. Each result has a name, bio, age, city and distance in whole kilometres, never coordinates. Because swiped people drop out, asking again gives the next people, so no page cursor is needed. `?limit=` accepts 1 to 50 (default 20).
