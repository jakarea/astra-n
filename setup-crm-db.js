const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCrmDatabase() {
  console.log('🚀 Setting up CRM database...')

  try {
    // Try to insert sample tags directly to test if tables exist
    console.log('📝 Testing database connection and creating sample data...')

    const { data: tags, error: tagError } = await supabase
      .from('crm_tags')
      .upsert([
        { name: 'vip', color: '#3ECF8E' },
        { name: 'urgente', color: '#EF4444' },
        { name: 'follow-up', color: '#F59E0B' },
        { name: 'newsletter', color: '#3B82F6' },
        { name: 'promozionale', color: '#8B5CF6' }
      ], { onConflict: 'name' })
      .select()

    if (tagError) {
      console.error('❌ Tags operation failed:', tagError.message)

      if (tagError.message.includes('relation "crm_tags" does not exist')) {
        console.log('\n📋 CRM tables do not exist. Please create them manually in Supabase dashboard.')
        console.log('🔗 Go to: https://supabase.com/dashboard/project/pxawqvnsshiwdvqkrxrb/editor')
        console.log('\n📝 Run this SQL in the SQL Editor:')
        console.log(`
-- Create CRM tables
CREATE TABLE IF NOT EXISTS crm_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL DEFAULT '#3ECF8E',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS crm_lead_events (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Insert sample tags
INSERT INTO crm_tags (name, color) VALUES
    ('vip', '#3ECF8E'),
    ('urgente', '#EF4444'),
    ('follow-up', '#F59E0B'),
    ('newsletter', '#3B82F6'),
    ('promozionale', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON crm_tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON crm_leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON crm_lead_events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON crm_lead_tags FOR ALL TO authenticated USING (true);
        `)
        return
      }
    } else {
      console.log('✅ Sample tags created successfully:', tags)
    }

    // Test creating a sample lead
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .insert({
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '+39 123 456 7890',
        source: 'website',
        logistic_status: 'pending',
        cod_status: 'pending',
        kpi_status: 'new',
        notes: 'This is a test lead created during setup'
      })
      .select()

    if (leadError) {
      console.error('❌ Lead creation failed:', leadError.message)
    } else {
      console.log('✅ Test lead created successfully:', lead)
    }

    console.log('🎉 CRM database setup completed!')

  } catch (error) {
    console.error('💥 Setup failed:', error)
  }
}

setupCrmDatabase()