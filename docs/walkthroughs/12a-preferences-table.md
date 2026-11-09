# 12a - Preferences table

Step by step:

1. A new migration (`0004_preferences.sql`) adds one row per user holding the age range and the maximum distance they want.
2. The database itself refuses ages under 18, a minimum above the maximum, and silly distances.
3. `preferences/repository.ts` has two functions: read a user's preferences, and save them (insert the first time, update after that).
4. Deleting a user removes their preferences too.
5. The tests run against a real Postgres schema made just for each test run.

The HTTP endpoints come once the auth guard is merged.
