# 16 - Consent endpoints

People can now see and change their own consents.

1. `GET /me/consents` shows whether terms, privacy and AI processing are currently granted. A new account starts with all three off.
2. `PUT /me/consents/:kind` with `{ "granted": true }` or `false` grants or withdraws one of them. An unknown kind gets a 404.
3. Every real change adds a row to the history table. Repeating the same answer adds nothing, so the history is a list of actual decisions.
4. Withdrawing AI consent also switches AI off on the person's profile in the same request, so nothing keeps running on old permission.
5. The user id always comes from the token, never from the URL.
