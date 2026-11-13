# 07b - Login endpoint

**What changed:** `POST /auth/login` now exists. Send an email and password, get back an access token, a refresh token and how long the access token lives (900 seconds).

1. The email is lowercased and looked up in `users`.
2. The password is checked with the same scrypt helper used at registration.
3. If the email is unknown, a dummy hash is still checked, so a wrong email and a wrong password take about the same time and give the same 401 message.
4. Banned users get a 403 and no tokens.
5. Tokens come from the helpers made in 07a. The secret is passed in when the app is built.

**Not done yet:** the refresh endpoint, and wiring the database and secret into `main.ts`. Item 7 stays unticked until refresh is in.
