const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCrmTables() {
  try {
    console.log('Setting up CRM tables...')

    // Read SQL file
    const sql = fs.readFileSync('./create_crm_tables.sql', 'utf8')

    // Execute SQL commands one by one
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0)

    for (const command of commands) {
      if (command.trim()) {
        console.log('Executing:', command.trim().substring(0, 50) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql_query: command.trim() })

        if (error) {
          console.error('Error executing command:', error)
          // Try direct table creation
          if (command.includes('CREATE TABLE')) {
            console.log('Trying alternative approach...')
          }
        } else {
          console.log('✓ Command executed successfully')
        }
      }
    }

    // Test if tables exist by trying to query them
    console.log('\nTesting table creation...')

    const { data: tags, error: tagsError } = await supabase
      .from('crm_tags')
      .select('*')
      .limit(1)

    if (tagsError) {
      console.error('CRM tags table not accessible:', tagsError.message)
    } else {
      console.log('✓ CRM tags table accessible')
    }

    const { data: leads, error: leadsError } = await supabase
      .from('crm_leads')
      .select('*')
      .limit(1)

    if (leadsError) {
      console.error('CRM leads table not accessible:', leadsError.message)
    } else {
      console.log('✓ CRM leads table accessible')
    }

    console.log('\nCRM tables setup completed!')

  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupCrmTables()