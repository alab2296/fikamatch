# Register endpoint

Item 6 is now wired up: `POST /auth/register`.

1. The body is checked with zod: email, a password of at least 10 characters, a birth date, and optionally a Swedish phone number and a language (sv or en).
2. Anyone under 18 gets a 403 before anything is saved.
3. The password is hashed with the helper from the last step and the user row is inserted. The email is stored in lowercase.
4. A second sign-up with the same email (in any casing) gets a 409, thanks to the unique index from the users migration.
5. Error messages come from the sv/en message files, so the reply matches the caller's language.

The route is only added when the app is given a database connection, so older tests that build a bare app keep working. Tests run against a real throwaway Postgres schema.
