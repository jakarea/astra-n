const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCrmTables() {
  console.log('🚀 Setting up CRM tables in Supabase...')

  try {
    // First ensure we have a demo user
    console.log('📝 Creating demo user...')
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: 'demo-user-id',
        name: 'Demo User',
        role: 'admin',
        email: 'demo@astra.com'
      })

    if (userError && !userError.message.includes('already exists')) {
      console.error('❌ User creation error:', userError)
    } else {
      console.log('✅ Demo user created/updated')
    }

    // Create CRM tags table
    console.log('📝 Creating crm_tags table...')
    const { error: tagsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crm_tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          color VARCHAR(7) NOT NULL DEFAULT '#3ECF8E',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (tagsTableError) {
      console.error('❌ CRM tags table error:', tagsTableError)
    } else {
      console.log('✅ CRM tags table created')
    }

    // Create CRM leads table
    console.log('📝 Creating crm_leads table...')
    const { error: leadsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crm_leads (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
      `
    })

    if (leadsTableError) {
      console.error('❌ CRM leads table error:', leadsTableError)
    } else {
      console.log('✅ CRM leads table created')
    }

    // Create CRM lead events table
    console.log('📝 Creating crm_lead_events table...')
    const { error: eventsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crm_lead_events (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (eventsTableError) {
      console.error('❌ CRM events table error:', eventsTableError)
    } else {
      console.log('✅ CRM events table created')
    }

    // Create CRM lead tags junction table
    console.log('📝 Creating crm_lead_tags table...')
    const { error: leadTagsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS crm_lead_tags (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
          UNIQUE(lead_id, tag_id)
        );
      `
    })

    if (leadTagsTableError) {
      console.error('❌ CRM lead tags table error:', leadTagsTableError)
    } else {
      console.log('✅ CRM lead tags table created')
    }

    // Insert sample tags
    console.log('📝 Creating sample tags...')
    const { error: sampleTagsError } = await supabase
      .from('crm_tags')
      .upsert([
        { name: 'vip', color: '#3ECF8E' },
        { name: 'urgente', color: '#EF4444' },
        { name: 'follow-up', color: '#F59E0B' },
        { name: 'newsletter', color: '#3B82F6' },
        { name: 'promozionale', color: '#8B5CF6' }
      ], { onConflict: 'name' })

    if (sampleTagsError) {
      console.error('❌ Sample tags error:', sampleTagsError)
    } else {
      console.log('✅ Sample tags created')
    }

    console.log('🎉 CRM tables setup completed successfully!')

  } catch (error) {
    console.error('💥 Setup failed:', error)
    process.exit(1)
  }
}

setupCrmTables()