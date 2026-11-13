# 16a - Consents table

Step by step:

1. A new migration (`0005_consents.sql`) adds a `consents` table. Each row says "this user granted or withdrew this kind of consent at this time".
2. The kinds are terms, privacy and AI processing. The database refuses anything else.
3. Rows are never edited. Withdrawing consent adds a new row, and the newest row decides. That keeps a history we can show if asked.
4. `consents/repository.ts` can record a consent, check one (`hasConsent`) and list the current state of all three.
5. Deleting a user deletes their consent rows too.

The HTTP endpoints come in a later step, once the auth guard is merged.
