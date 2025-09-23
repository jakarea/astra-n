-- Fix CRM Database Permissions and Relationships
-- Execute this in Supabase SQL Editor to fix the permission issues

-- 1. Disable RLS temporarily or create proper policies
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags DISABLE ROW LEVEL SECURITY;

-- Alternative: If you prefer to keep RLS enabled, create permissive policies
-- (uncomment the lines below and comment the DISABLE lines above)
/*
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for service role
CREATE POLICY "Allow all for service role" ON crm_tags FOR ALL TO service_role USING (true);
CREATE POLICY "Allow all for service role" ON crm_leads FOR ALL TO service_role USING (true);
CREATE POLICY "Allow all for service role" ON crm_lead_events FOR ALL TO service_role USING (true);
CREATE POLICY "Allow all for service role" ON crm_lead_tags FOR ALL TO service_role USING (true);

-- Create policies for authenticated users
CREATE POLICY "Allow all for authenticated" ON crm_tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON crm_leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON crm_lead_events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON crm_lead_tags FOR ALL TO authenticated USING (true);
*/

-- 2. Fix the user_id column to properly reference auth.users
-- Drop the existing foreign key constraint if it exists
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_user_id_fkey;

-- Make sure user_id column can be null (since we might not always have a user)
ALTER TABLE crm_leads ALTER COLUMN user_id DROP NOT NULL;

-- Add foreign key constraint referencing auth.users (Supabase's user table)
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Do the same for crm_lead_events
ALTER TABLE crm_lead_events DROP CONSTRAINT IF EXISTS crm_lead_events_user_id_fkey;
ALTER TABLE crm_lead_events ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE crm_lead_events ADD CONSTRAINT crm_lead_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Insert sample data if tables are empty
INSERT INTO crm_tags (name, color) VALUES
    ('vip', '#14b8a6'),
    ('urgente', '#ef4444'),
    ('follow-up', '#f59e0b'),
    ('newsletter', '#3b82f6'),
    ('promozionale', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- 4. Test by inserting a sample lead
INSERT INTO crm_leads (name, email, phone, source, notes) VALUES
    ('Test Lead', 'test@example.com', '+39 123 456 7890', 'website', 'Test lead created via SQL')
ON CONFLICT DO NOTHING;

-- 5. Grant necessary permissions to authenticated role
GRANT ALL ON crm_tags TO authenticated;
GRANT ALL ON crm_leads TO authenticated;
GRANT ALL ON crm_lead_events TO authenticated;
GRANT ALL ON crm_lead_tags TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON SEQUENCE crm_tags_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE crm_leads_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_events_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_tags_id_seq TO authenticated;

-- 6. Also grant to service_role (used by API)
GRANT ALL ON crm_tags TO service_role;
GRANT ALL ON crm_leads TO service_role;
GRANT ALL ON crm_lead_events TO service_role;
GRANT ALL ON crm_lead_tags TO service_role;

GRANT USAGE, SELECT ON SEQUENCE crm_tags_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_leads_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE crm_lead_tags_id_seq TO service_role;