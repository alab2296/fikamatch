# Password hashing and the 18+ check

First building blocks for the register endpoint (item 6). Nothing is wired to a route yet.

1. `hashPassword` turns a password into a salted scrypt hash. Same password, different hash every time.
2. `verifyPassword` checks a password against a stored hash in constant time.
3. `isAdult` works out age from a YYYY-MM-DD birth date and says no to anyone under 18, and to dates that do not exist (like 30 February).

Both use only what Node ships with, so there is no new dependency. Tests cover the edge cases: turning 18 today vs tomorrow, leap-day birthdays, malformed input.
