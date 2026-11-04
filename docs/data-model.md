# Data model (first draft)

- `users`: id, email, phone (+46), password_hash, role, birth_date, locale, banned_at, created_at
- `profiles`: user_id, display_name, bio, gender, looking_for, city_id, location (PostGIS, rounded), ai_enabled
- `photos`: id, user_id, storage_key, position
- `preferences`: user_id, age_min, age_max, max_distance_km, relationship_type, pace, deal_breakers
- `cities`: id, name, country, centre (PostGIS)
- `swipes`: swiper_id, target_id, direction, created_at, PK (swiper_id, target_id)
- `matches`: id, user_a, user_b, created_at, UNIQUE (least(user_a,user_b), greatest(user_a,user_b))
- `blocks`: blocker_id, blocked_id, created_at, PK (blocker_id, blocked_id)
- `reports`: id, reporter_id, target_id, reason, status, created_at
- `messages`: id, match_id, sender_id, body, created_at, read_at
- `consents`: user_id, kind, granted_at, revoked_at
- `ai_audit`: id, user_id, feature, model, input_summary, output_summary, created_at
- `verifications`: user_id, provider, status, verified_at
