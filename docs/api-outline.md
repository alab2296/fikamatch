# API outline

All paths under `/v1`. Errors use a stable `code` that maps to a translation key.

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- Me: `GET/PATCH /me`, `GET /me/export`, `DELETE /me`, `PUT /me/consents/:kind`
- Profile: `GET/PUT /me/profile`, `POST /me/photos`, `DELETE /me/photos/:id`, `PUT /me/preferences`
- Discovery: `GET /feed`, `POST /swipes`
- Matches: `GET /matches`, `DELETE /matches/:id`
- Safety: `POST /blocks`, `DELETE /blocks/:userId`, `POST /reports`
- Chat: `GET /matches/:id/messages`, WebSocket `/ws`
- AI: `POST /ai/interview/turn`, `GET /matches/:id/explanation`, `POST /matches/:id/date-plan`
- Admin: `GET /admin/reports`, `POST /admin/users/:id/ban`, `GET /admin/ai-audit`
- Ops: `GET /health`
