-- Moozik Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- Users (custom auth — passwords stored as bcrypt hashes by the app)
CREATE TABLE IF NOT EXISTS public."user" (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS public.contact (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (required for Supabase anon key access)
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can sign up"
  ON public."user"
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can sign in lookup"
  ON public."user"
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon can submit contact"
  ON public.contact
  FOR INSERT
  TO anon
  WITH CHECK (true);
