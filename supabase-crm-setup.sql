-- CRM Database Setup for Astra Project
-- Execute this in Supabase SQL Editor: https://supabase.com/dashboard/project/pxawqvnsshiwdvqkrxrb/editor

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
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Create CRM lead events table
CREATE TABLE IF NOT EXISTS crm_lead_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Insert sample tags
INSERT INTO crm_tags (name, color) VALUES
    ('vip', '#14b8a6'),
    ('urgente', '#ef4444'),
    ('follow-up', '#f59e0b'),
    ('newsletter', '#3b82f6'),
    ('promozionale', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

-- Create policies to allow authenticated users to access all data
CREATE POLICY "Allow all operations for authenticated users" ON crm_tags
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON crm_leads
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON crm_lead_events
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON crm_lead_tags
    FOR ALL TO authenticated USING (true);

-- Create some sample leads for testing
INSERT INTO crm_leads (user_id, name, email, phone, source, logistic_status, cod_status, kpi_status, notes) VALUES
    ((SELECT id FROM auth.users LIMIT 1), 'Marco Rossi', 'marco.rossi@email.com', '+39 335 123 4567', 'website', 'processing', 'pending', 'contacted', 'Lead interessato ai prodotti wireless'),
    ((SELECT id FROM auth.users LIMIT 1), 'Giulia Ferrari', 'giulia.ferrari@email.com', '+39 347 987 6543', 'social_media', 'shipped', 'confirmed', 'proposal', 'Richiesta informazioni su fitness tracker'),
    ((SELECT id FROM auth.users LIMIT 1), 'Alessandro Conti', 'alessandro.conti@email.com', '+39 339 456 7890', 'email', 'cancelled', 'rejected', 'lost', 'Non interessato al momento'),
    ((SELECT id FROM auth.users LIMIT 1), 'Francesca Ricci', 'francesca.ricci@email.com', '+39 342 678 9012', 'referral', 'processing', 'pending', 'qualified', 'Referral da cliente esistente'),
    ((SELECT id FROM auth.users LIMIT 1), 'Roberto Gallo', 'roberto.gallo@email.com', '+39 348 234 5678', 'advertisement', 'delivered', 'confirmed', 'won', 'Ordine completato con successo')
ON CONFLICT DO NOTHING;