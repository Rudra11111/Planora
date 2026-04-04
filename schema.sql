-- ============================================================
-- Planora Database Schema
-- Paste this into your Supabase SQL Editor and run it.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- events: stores raw event metadata from the API input
CREATE TABLE IF NOT EXISTS events (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  type         TEXT    NOT NULL,
  duration     TEXT    NOT NULL,
  attendees    INTEGER NOT NULL,
  team_size    INTEGER,
  budget_range TEXT
);

-- plans: stores the AI-generated plan linked to an event
CREATE TABLE IF NOT EXISTS plans (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  share_token  TEXT    UNIQUE NOT NULL,
  plan_data    JSONB   NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token uniqueness lookups
CREATE INDEX IF NOT EXISTS idx_plans_share_token ON plans(share_token);

-- task_updates: stores the user-driven state changes for specific tasks
CREATE TABLE IF NOT EXISTS task_updates (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID    NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_id      TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'failed'
  note         TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, task_id)
);
