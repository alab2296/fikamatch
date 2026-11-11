# Swipes table

Small step towards item 19: the storage for swipes, without the endpoint yet.

1. A `swipes` table holds who swiped on whom and whether it was a like or a pass.
2. The pair (swiper, target) is the primary key, so one person can only have one answer per profile.
3. `recordSwipe` ignores repeats, which makes the future endpoint safe to retry.
4. `hasLikedBy` tells the match step whether the other person already liked you.
5. Swiping yourself is blocked, and rows go away with either user.
6. Tests run against real Postgres in their own schema.
