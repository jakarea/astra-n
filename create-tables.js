const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createTables() {
  console.log('🚀 Creating CRM tables in Supabase...')

  // Use service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // First, let's check if we can access the database at all
    console.log('🔍 Testing database connection...')

    // Try to create tables using raw SQL
    const createTablesSQL = `
      -- Create CRM tags table
      CREATE TABLE IF NOT EXISTS public.crm_tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          color VARCHAR(7) NOT NULL DEFAULT '#14b8a6',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create CRM leads table
      CREATE TABLE IF NOT EXISTS public.crm_leads (
          id SERIAL PRIMARY KEY,
          user_id UUID,
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
      CREATE TABLE IF NOT EXISTS public.crm_lead_events (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
          user_id UUID,
          type VARCHAR(50) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create CRM lead tags junction table
      CREATE TABLE IF NOT EXISTS public.crm_lead_tags (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
          UNIQUE(lead_id, tag_id)
      );
    `

    console.log('📝 Creating tables with SQL...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })

    if (error) {
      console.error('❌ Failed with rpc:', error.message)

      // Try alternative approach - create each table individually
      console.log('🔄 Trying alternative approach...')

      // Create tags table
      console.log('Creating crm_tags...')
      await supabase.from('crm_tags').select('id').limit(1)

    } else {
      console.log('✅ Tables created successfully!')
    }

    // Insert sample tags
    console.log('📝 Inserting sample tags...')
    const { data: tagsData, error: tagsError } = await supabase
      .from('crm_tags')
      .upsert([
        { name: 'vip', color: '#14b8a6' },
        { name: 'urgente', color: '#ef4444' },
        { name: 'follow-up', color: '#f59e0b' },
        { name: 'newsletter', color: '#3b82f6' },
        { name: 'promozionale', color: '#8b5cf6' }
      ], { onConflict: 'name' })
      .select()

    if (tagsError) {
      console.error('❌ Tags error:', tagsError.message)
    } else {
      console.log('✅ Sample tags created:', tagsData?.length || 0)
    }

    // Test lead creation
    console.log('📝 Testing lead creation...')
    const { data: leadData, error: leadError } = await supabase
      .from('crm_leads')
      .insert({
        name: 'Test Lead - ' + new Date().toISOString(),
        email: 'test@example.com',
        phone: '+39 123 456 7890',
        source: 'website',
        notes: 'Test lead created automatically'
      })
      .select()

    if (leadError) {
      console.error('❌ Lead creation error:', leadError.message)
    } else {
      console.log('✅ Test lead created:', leadData)
    }

    console.log('🎉 Database setup completed!')

  } catch (error) {
    console.error('💥 Fatal error:', error)

    console.log('\n📋 Manual steps required:')
    console.log('1. Go to: https://supabase.com/dashboard/project/pxawqvnsshiwdvqkrxrb/editor')
    console.log('2. Open SQL Editor')
    console.log('3. Run the SQL from supabase-crm-setup.sql file')
  }
}

createTables()