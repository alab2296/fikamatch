# Blocks table

Small step towards item 17: the storage for blocks, without the endpoints yet.

1. A `blocks` table holds one row per "A blocked B". The pair is the primary key, so blocking twice cannot create a duplicate.
2. A check stops anyone blocking themselves.
3. Rows disappear with the user (`ON DELETE CASCADE`), so deleting an account really removes its blocks.
4. `isBlockedEitherWay` answers "may these two see each other?" and works in both directions. The feed, swipes and chat will all call it.
5. Tests run against real Postgres in their own schema.
