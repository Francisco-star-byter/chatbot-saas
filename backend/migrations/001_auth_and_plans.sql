-- ============================================================
-- Migration 001: Auth, Plans, and Usage tracking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Plans table
CREATE TABLE IF NOT EXISTS plans (
  id                           TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  max_conversations_per_month  INT  NOT NULL, -- -1 = unlimited
  max_leads                    INT,           -- NULL = unlimited
  telegram_alerts              BOOLEAN DEFAULT false,
  price_monthly                DECIMAL(10,2) DEFAULT 0
);

INSERT INTO plans (id, name, max_conversations_per_month, max_leads, telegram_alerts, price_monthly) VALUES
  ('free',   'Gratuito', 100,  20,   false, 0),
  ('pro',    'Pro',      1000, NULL, true,  29),
  ('agency', 'Agencia',  -1,   NULL, true,  79)
ON CONFLICT (id) DO NOTHING;

-- 2. Add user_id and plan_id to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_id  TEXT REFERENCES plans(id) DEFAULT 'free';

-- 3. Usage table (conversation counter per client per month)
CREATE TABLE IF NOT EXISTS usage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID REFERENCES clients(id) ON DELETE CASCADE,
  month               DATE NOT NULL,
  conversation_count  INT DEFAULT 0,
  UNIQUE(client_id, month)
);
