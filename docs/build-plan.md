# Build plan

One item is roughly one working day. Tick an item only when its pull request is merged.
Each merged item also gets a note in `docs/walkthroughs/`.

## Phase 1 - Foundation

- [x] 1. Monorepo, CI, PR template
- [ ] 2. Product docs and this plan
- [ ] 3. Config loading with zod (env validation) and structured logging
- [ ] 4. Database setup: migration runner, per-test schema helper, first migration (users)
- [ ] 5. i18n: sv/en message files, locale detection, translated error responses
- [ ] 6. Register endpoint with password hashing and 18+ age gate
- [ ] 7. Login, JWT access and refresh tokens
- [ ] 8. Roles and auth guard, rate limits on auth routes
- [ ] 9. VerificationProvider interface and fake implementation

## Phase 2 - Profiles

- [ ] 10. Cities table and seed (Stockholm, Gothenburg, Malmo, Uppsala)
- [ ] 11. Profile CRUD
- [ ] 12. Preferences CRUD
- [ ] 13. Approximate location with PostGIS (rounding, never exact)
- [ ] 14. Photo storage interface and signed URLs
- [ ] 15. Photo upload and ordering endpoints
- [ ] 16. Consents table and endpoints

## Phase 3 - Discovery

- [ ] 17. Blocks table and endpoints
- [ ] 18. Candidate feed query (age, distance, preferences, excludes blocked and swiped)
- [ ] 19. Swipe endpoint, idempotent
- [ ] 20. Atomic mutual match, concurrency test
- [ ] 21. Matches list and unmatch
- [ ] 22. Reports table and endpoint
- [ ] 23. Rate limits on swipes

## Phase 4 - Chat

- [ ] 24. Messages table and REST history
- [ ] 25. WebSocket gateway with JWT auth
- [ ] 26. Send and receive over WebSocket, block enforcement
- [ ] 27. Read receipts
- [ ] 28. Chat rate limits and message size limits
- [ ] 29. Redis pub/sub fan-out

## Phase 5 - AI

- [ ] 30. LlmProvider interface, fake provider, Anthropic provider
- [ ] 31. AI audit log, feature flags, consent checks
- [ ] 32. Explained matches
- [ ] 33. Explained matches: language handling and tests
- [ ] 34. Intent interview: conversation state
- [ ] 35. Intent interview: extraction into preferences
- [ ] 36. Safety guard: rule-based first pass
- [ ] 37. Safety guard: model pass and receiver warning
- [ ] 38. One-tap report from a warning
- [ ] 39. First-date planner: venue data (fika spots) for the four cities
- [ ] 40. First-date planner: time fitting and endpoint
- [ ] 41. Per-user AI off switch across all features

## Phase 6 - Admin web

- [ ] 42. Admin API: reports queue
- [ ] 43. Admin API: user lookup and ban
- [ ] 44. Admin API: AI audit log
- [ ] 45. Admin web scaffold (React, Vite) and login
- [ ] 46. Reports queue screen
- [ ] 47. User lookup and ban screen
- [ ] 48. AI audit screen

## Phase 7 - Polish

- [ ] 49. GDPR export
- [ ] 50. GDPR delete (rows and files really gone), test
- [ ] 51. OpenAPI file and contract test
- [ ] 52. Generated Dart client setup
- [ ] 53. README with diagram
- [ ] 54. Load test
- [ ] 55. Tag v0.1.0
- [ ] 56. Hardening pass and tag v1.0.0

## Phase 8 - Flutter app (from about month 3)

- [ ] 57. Flutter scaffold, Riverpod, go_router, secure storage
- [ ] 58. Onboarding and age gate
- [ ] 59. Intent interview screen
- [ ] 60. Feed and swipe
- [ ] 61. Matches list with "why you two"
- [ ] 62. Chat screen over WebSocket
- [ ] 63. Safety screens: warning, report, block
- [ ] 64. First-date planner screen
- [ ] 65. Settings: language, AI toggle, export, delete
- [ ] 66. Push notifications
