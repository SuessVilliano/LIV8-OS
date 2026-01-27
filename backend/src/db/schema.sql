-- LIV8 GHL Multi-Tenant Database Schema

-- Agencies (top-level tenants)
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (belong to agencies)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'operator', 'viewer')) DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GHL Locations (sub-accounts within agencies)
CREATE TABLE IF NOT EXISTS ghl_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  ghl_location_id TEXT UNIQUE NOT NULL,
  name TEXT,
  encrypted_access_token TEXT NOT NULL, -- PIT or OAuth token (encrypted)
  token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log (every action tracked)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  location_id TEXT,
  action_type TEXT NOT NULL, -- 'create_contact', 'send_sms', 'create_workflow', etc.
  tool_name TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT CHECK (status IN ('success', 'failure')) NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Macros/Templates (reusable action sequences)
CREATE TABLE IF NOT EXISTS macros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'workflow', 'funnel', 'sequence', etc.
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Settings (API keys, webhooks, preferences - all encrypted)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT UNIQUE NOT NULL,
  settings_data JSONB NOT NULL, -- Encrypted API keys and preferences
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Brand Brains (AI-analyzed brand identity)
CREATE TABLE IF NOT EXISTS brand_brains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT UNIQUE NOT NULL,
  brain_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_locations_agency ON ghl_locations(agency_id);
CREATE INDEX IF NOT EXISTS idx_locations_ghl_id ON ghl_locations(ghl_location_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_agency ON audit_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_macros_agency ON macros(agency_id);
