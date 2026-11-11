# Reports table

Small step towards item 22: the storage for user reports, without the endpoint yet.

1. A `reports` table holds who reported whom, a reason from a fixed list, and optional details (max 1000 characters).
2. A check stops people reporting themselves.
3. New reports start as `open`; a moderator will later mark them reviewed or dismissed.
4. Rows disappear with either user (`ON DELETE CASCADE`), so deleting an account really removes the reports about and by them.
5. `listOpenReports` returns the oldest open reports first, for the admin queue later.
6. Tests run against real Postgres in their own schema.
