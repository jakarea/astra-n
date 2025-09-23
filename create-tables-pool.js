const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function createTablesViaPool() {
  console.log('🚀 Connecting to PostgreSQL via connection pool...')

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database via pool')

    // Create CRM tags table
    console.log('📝 Creating crm_tags table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          color VARCHAR(7) NOT NULL DEFAULT '#14b8a6',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    console.log('✅ crm_tags table created')

    // Create CRM leads table
    console.log('📝 Creating crm_leads table...')
    await client.query(`
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
    `)
    console.log('✅ crm_leads table created')

    // Create CRM lead events table
    console.log('📝 Creating crm_lead_events table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_events (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    console.log('✅ crm_lead_events table created')

    // Create CRM lead tags junction table
    console.log('📝 Creating crm_lead_tags table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_tags (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
          UNIQUE(lead_id, tag_id)
      );
    `)
    console.log('✅ crm_lead_tags table created')

    // Insert sample tags
    console.log('📝 Inserting sample tags...')
    await client.query(`
      INSERT INTO crm_tags (name, color) VALUES
          ('vip', '#14b8a6'),
          ('urgente', '#ef4444'),
          ('follow-up', '#f59e0b'),
          ('newsletter', '#3b82f6'),
          ('promozionale', '#8b5cf6')
      ON CONFLICT (name) DO NOTHING;
    `)
    console.log('✅ Sample tags inserted')

    // Create sample leads
    console.log('📝 Creating sample leads...')
    const sampleLeads = [
      ['Marco Rossi', 'marco.rossi@email.com', '+39 335 123 4567', 'website', 'Lead interessato ai prodotti wireless'],
      ['Giulia Ferrari', 'giulia.ferrari@email.com', '+39 347 987 6543', 'social_media', 'Richiesta informazioni su fitness tracker'],
      ['Alessandro Conti', 'alessandro.conti@email.com', '+39 339 456 7890', 'email', 'Follow-up necessario'],
      ['Francesca Ricci', 'francesca.ricci@email.com', '+39 342 678 9012', 'referral', 'Referral da cliente esistente'],
      ['Roberto Gallo', 'roberto.gallo@email.com', '+39 348 234 5678', 'advertisement', 'Interessato a speaker bluetooth']
    ]

    for (const lead of sampleLeads) {
      const result = await client.query(`
        INSERT INTO crm_leads (name, email, phone, source, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, lead)

      if (result.rows.length > 0) {
        console.log(`✅ Created lead: ${lead[0]} (ID: ${result.rows[0].id})`)
      }
    }

    console.log('🎉 All CRM tables and sample data created successfully!')
    console.log('🔄 Now refresh your CRM page at http://localhost:3000/crm')

  } catch (error) {
    console.error('💥 Error:', error.message)

    if (error.message.includes('permission denied')) {
      console.log('\n⚠️  Permission denied - database needs manual setup')
      console.log('🔗 Please go to Supabase dashboard and run the SQL manually:')
      console.log('   https://supabase.com/dashboard/project/pxawqvnsshiwdvqkrxrb/editor')
    }
  } finally {
    await client.end()
    console.log('📴 Database connection closed')
  }
}

createTablesViaPool()