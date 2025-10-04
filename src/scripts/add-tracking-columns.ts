import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addTrackingColumns() {
  try {
    console.log('Adding tracking columns to orders table...')

    // Execute SQL to add columns
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS tracking_slug VARCHAR(255);

        CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
      `
    })

    if (error) {
      console.error('Error:', error)

      // Try alternative approach using raw query
      console.log('Trying alternative approach...')
      console.log('\nPlease run this SQL manually in your Supabase SQL Editor:')
      console.log(`
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_slug VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
      `)
    } else {
      console.log('✅ Tracking columns added successfully!')
      console.log('Data:', data)
    }
  } catch (error) {
    console.error('Failed:', error)
    console.log('\n⚠️ Please run this SQL manually in your Supabase SQL Editor:')
    console.log(`
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tracking_slug VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
    `)
  }
}

addTrackingColumns()
