CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  birth_date date NOT NULL,
  locale text NOT NULL DEFAULT 'sv' CHECK (locale IN ('sv', 'en')),
  banned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_phone_se CHECK (phone IS NULL OR phone ~ '^\+46[0-9]{7,10}$'),
  CONSTRAINT users_adult CHECK (birth_date <= (created_at::date - interval '18 years'))
);

CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
CREATE UNIQUE INDEX users_phone_key ON users (phone) WHERE phone IS NOT NULL;
