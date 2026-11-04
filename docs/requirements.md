# Requirements

## Functional

- Register, log in, JWT sessions, roles (user, moderator, admin).
- Age gate: 18+ enforced at registration.
- Profiles, photos (signed URLs), preferences, approximate location (PostGIS).
- Candidate feed, like/pass swipes, atomic mutual match, block, report.
- Chat over WebSockets with stored messages and read receipts.
- AI features 1 to 4, each behind a feature flag, each logged.
- Admin: reports queue, user lookup, ban, AI audit log.
- Identity verification behind a `VerificationProvider` interface (fake implementation now).

## Non-functional

- Every user-facing string comes from translation files (sv, en).
- Rate limits on auth, swipes and chat.
- Data integrity guaranteed by the database (unique constraints, transactions), tested on a real DB.
- Personal data stays in EU regions.
- Secrets only in `.env`, never committed.

## GDPR

- Explicit consent before any AI processing, revocable.
- Data export (JSON) and account deletion that really removes rows and files.
- Store the minimum; AI calls log what was done, not more than needed.

## Safety rules that must always hold

- A blocked pair never sees or messages each other.
- A swipe pair produces at most one match.
- Exact coordinates are never returned by the API.
