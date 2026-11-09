# Profiles table and repository

First half of profile CRUD: the storage, with no routes yet (those wait for the auth guard to land).

1. Migration `0003_profiles.sql` adds `profiles`, one row per user, removed automatically when the user is deleted.
2. Display name (1-40 chars), bio (up to 500), gender and who they are looking for are checked in the database itself.
3. The city must exist in `cities`. AI features start switched off.
4. `src/profiles/repository.ts` has `getProfile`, `saveProfile` (create or update) and `deleteProfile`.
5. Saving without an AI choice keeps whatever was set before.
6. The exact location column comes with the PostGIS item.
