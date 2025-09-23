-- Create CRM tables for testing
-- First ensure we have a demo user
INSERT INTO users (id, name, role) VALUES ('demo-user-id', 'Demo User', 'admin') ON CONFLICT (id) DO NOTHING;

-- Create CRM tags table
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#3ECF8E',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CRM leads table
CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(50) NOT NULL,
    logistic_status VARCHAR(50) DEFAULT 'pending',
    cod_status VARCHAR(50) DEFAULT 'pending',
    kpi_status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create CRM lead events table
CREATE TABLE IF NOT EXISTS crm_lead_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Insert some sample tags
INSERT INTO crm_tags (name, color) VALUES
    ('vip', '#3ECF8E'),
    ('urgente', '#EF4444'),
    ('follow-up', '#F59E0B'),
    ('newsletter', '#3B82F6'),
    ('promozionale', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;