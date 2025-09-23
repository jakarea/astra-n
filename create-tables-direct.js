const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function createTablesDirectly() {
  console.log('🚀 Connecting directly to PostgreSQL database...')

  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

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
    `)
    console.log('✅ crm_leads table created')

    // Create CRM lead events table
    console.log('📝 Creating crm_lead_events table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_events (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
          user_id UUID,
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

    // Create a sample lead
    console.log('📝 Creating sample lead...')
    const result = await client.query(`
      INSERT INTO crm_leads (name, email, phone, source, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [
      'Test Lead - ' + new Date().toISOString(),
      'test@example.com',
      '+39 123 456 7890',
      'website',
      'Test lead created automatically'
    ])
    console.log('✅ Sample lead created:', result.rows[0])

    console.log('🎉 All CRM tables created successfully!')
    console.log('🔄 Now try refreshing your CRM page - it should show real data!')

  } catch (error) {
    console.error('💥 Error:', error.message)
  } finally {
    await client.end()
    console.log('📴 Database connection closed')
  }
}

createTablesDirectly()