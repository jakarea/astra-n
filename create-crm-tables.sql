-- Create CRM tables without user dependencies
-- Run this directly in Supabase SQL Editor

-- Create CRM tags table
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#14b8a6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CRM leads table (no user_id)
CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(50) NOT NULL,
    logistic_status VARCHAR(50) DEFAULT 'pending',
    cod_status VARCHAR(50) DEFAULT 'pending',
    kpi_status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CRM lead events table (no user_id)
CREATE TABLE IF NOT EXISTS crm_lead_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CRM lead tags junction table
CREATE TABLE IF NOT EXISTS crm_lead_tags (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    UNIQUE(lead_id, tag_id)
);

-- Remove any existing foreign key constraints to users
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_user_id_fkey;
ALTER TABLE crm_lead_events DROP CONSTRAINT IF EXISTS crm_lead_events_user_id_fkey;

-- Remove user_id columns if they exist
ALTER TABLE crm_leads DROP COLUMN IF EXISTS user_id;
ALTER TABLE crm_lead_events DROP COLUMN IF EXISTS user_id;

-- Disable RLS for all CRM tables
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated and service_role
GRANT ALL ON crm_tags TO authenticated, service_role;
GRANT ALL ON crm_leads TO authenticated, service_role;
GRANT ALL ON crm_lead_events TO authenticated, service_role;
GRANT ALL ON crm_lead_tags TO authenticated, service_role;

-- Grant usage on sequences
GRANT USAGE, SELECT ON SEQUENCE crm_tags_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_leads_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_events_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_tags_id_seq TO authenticated, service_role;

-- Insert sample tags
INSERT INTO crm_tags (name, color) VALUES
    ('vip', '#14b8a6'),
    ('urgente', '#ef4444'),
    ('follow-up', '#f59e0b'),
    ('newsletter', '#3b82f6'),
    ('promozionale', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Insert sample leads
INSERT INTO crm_leads (name, email, phone, source, notes) VALUES
    ('Marco Rossi', 'marco.rossi@email.com', '+39 335 123 4567', 'website', 'Lead interested in wireless products'),
    ('Giulia Ferrari', 'giulia.ferrari@email.com', '+39 347 987 6543', 'social_media', 'Requested information about fitness tracker'),
    ('Alessandro Conti', 'alessandro.conti@email.com', '+39 339 456 7890', 'email', 'Follow-up needed'),
    ('Francesca Ricci', 'francesca.ricci@email.com', '+39 342 678 9012', 'referral', 'Referral from existing customer'),
    ('Roberto Gallo', 'roberto.gallo@email.com', '+39 348 234 5678', 'advertisement', 'Interested in bluetooth speakers')
ON CONFLICT DO NOTHING;