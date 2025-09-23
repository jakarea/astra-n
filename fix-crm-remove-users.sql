-- Remove user_id dependencies from CRM tables
-- CRM leads should be independent entities without user relationships

-- 1. Drop foreign key constraints referencing users
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_user_id_fkey;
ALTER TABLE crm_lead_events DROP CONSTRAINT IF EXISTS crm_lead_events_user_id_fkey;

-- 2. Remove user_id columns entirely from CRM tables
ALTER TABLE crm_leads DROP COLUMN IF EXISTS user_id;
ALTER TABLE crm_lead_events DROP COLUMN IF EXISTS user_id;

-- 3. Recreate tables structure without user references if needed
-- (This is for reference - tables should already exist)

/*
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#14b8a6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS crm_lead_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_lead_tags (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    UNIQUE(lead_id, tag_id)
);
*/

-- 4. Ensure RLS is disabled for CRM tables
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags DISABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT ALL ON crm_tags TO authenticated, service_role;
GRANT ALL ON crm_leads TO authenticated, service_role;
GRANT ALL ON crm_lead_events TO authenticated, service_role;
GRANT ALL ON crm_lead_tags TO authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE crm_tags_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_leads_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_events_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_tags_id_seq TO authenticated, service_role;