-- Fix schema-level permissions for Supabase service role
-- Run this in Supabase SQL Editor after creating the tables

-- Grant usage on public schema to service_role and authenticated
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant all privileges on public schema
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO authenticated;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant all privileges on all sequences in public schema
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant all privileges on all functions in public schema
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- Specifically grant on CRM tables again to be sure
GRANT ALL ON crm_tags TO service_role, authenticated;
GRANT ALL ON crm_leads TO service_role, authenticated;
GRANT ALL ON crm_lead_events TO service_role, authenticated;
GRANT ALL ON crm_lead_tags TO service_role, authenticated;

GRANT ALL ON SEQUENCE crm_tags_id_seq TO service_role, authenticated;
GRANT ALL ON SEQUENCE crm_leads_id_seq TO service_role, authenticated;
GRANT ALL ON SEQUENCE crm_lead_events_id_seq TO service_role, authenticated;
GRANT ALL ON SEQUENCE crm_lead_tags_id_seq TO service_role, authenticated;

-- Ensure RLS is disabled
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags DISABLE ROW LEVEL SECURITY;