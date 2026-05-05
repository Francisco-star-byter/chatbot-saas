-- ============================================================
-- CHATBOT SAAS INMOBILIARIO — Schema completo
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: clients
-- Cada cliente es una inmobiliaria que usa el SaaS
-- ============================================================
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  api_key    TEXT NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: business_config
-- Configuración específica de cada inmobiliaria
-- ============================================================
CREATE TABLE business_config (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tone          TEXT DEFAULT 'profesional',
  zones         JSONB DEFAULT '[]',
  services      JSONB DEFAULT '[]',
  custom_prompt TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- ============================================================
-- TABLA: conversations
-- Una conversación por sesión de usuario
-- ============================================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: messages
-- Cada mensaje dentro de una conversación
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: leads
-- Leads capturados con datos de contacto
-- ============================================================
CREATE TABLE leads (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT,
  phone      TEXT,
  budget     TEXT,
  zone       TEXT,
  status     TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance en queries multi-tenant
-- ============================================================
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_business_config_client_id ON business_config(client_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Activar en todas las tablas — el backend usa service_role
-- que bypasea RLS, pero lo activamos como buena práctica
-- para proteger contra acceso directo desde el cliente
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política: solo el service_role (backend) puede acceder
-- El service_role bypasea RLS automáticamente en Supabase
-- Las políticas siguientes bloquean acceso anónimo/público
CREATE POLICY "No public access to clients"
  ON clients FOR ALL USING (false);

CREATE POLICY "No public access to business_config"
  ON business_config FOR ALL USING (false);

CREATE POLICY "No public access to conversations"
  ON conversations FOR ALL USING (false);

CREATE POLICY "No public access to messages"
  ON messages FOR ALL USING (false);

CREATE POLICY "No public access to leads"
  ON leads FOR ALL USING (false);

-- ============================================================
-- DATOS INICIALES — Cliente de prueba
-- ============================================================
INSERT INTO clients (id, name, api_key) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Inmobiliaria Demo',
  'demo-client-key-001'
);

INSERT INTO business_config (client_id, tone, zones, services, custom_prompt) VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'profesional y cercano',
  '["Miraflores", "San Isidro", "Barranco", "Surco", "La Molina"]',
  '["Venta de departamentos", "Alquiler de oficinas", "Casas de playa"]',
  'Somos una inmobiliaria premium especializada en Lima moderna.'
);

-- ============================================================
-- VERIFICACIÓN — Ejecuta esto para confirmar que todo creó bien
-- ============================================================
SELECT 'clients' as tabla, count(*) FROM clients
UNION ALL
SELECT 'business_config', count(*) FROM business_config
UNION ALL
SELECT 'conversations', count(*) FROM conversations
UNION ALL
SELECT 'messages', count(*) FROM messages
UNION ALL
SELECT 'leads', count(*) FROM leads;
