import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('[SETUP_RLS] Starting RLS setup for CRM tables...')

    // Enable RLS on crm_leads table
    const enableRLS = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;'
    })

    if (enableRLS.error) {
      console.error('[SETUP_RLS] Error enabling RLS:', enableRLS.error)
      return NextResponse.json(
        { error: `Failed to enable RLS: ${enableRLS.error.message}` },
        { status: 500 }
      )
    }

    // Create RLS policies
    const policies = [
      // Users can view their own leads
      {
        name: 'Users can view own leads',
        sql: `CREATE POLICY "Users can view own leads" ON crm_leads
              FOR SELECT
              USING (auth.uid()::text = user_id);`
      },
      // Users can insert their own leads
      {
        name: 'Users can insert own leads',
        sql: `CREATE POLICY "Users can insert own leads" ON crm_leads
              FOR INSERT
              WITH CHECK (auth.uid()::text = user_id);`
      },
      // Users can update their own leads
      {
        name: 'Users can update own leads',
        sql: `CREATE POLICY "Users can update own leads" ON crm_leads
              FOR UPDATE
              USING (auth.uid()::text = user_id)
              WITH CHECK (auth.uid()::text = user_id);`
      },
      // Users can delete their own leads
      {
        name: 'Users can delete own leads',
        sql: `CREATE POLICY "Users can delete own leads" ON crm_leads
              FOR DELETE
              USING (auth.uid()::text = user_id);`
      },
      // Admins can view all leads
      {
        name: 'Admins can view all leads',
        sql: `CREATE POLICY "Admins can view all leads" ON crm_leads
              FOR SELECT
              USING (
                EXISTS (
                  SELECT 1 FROM users
                  WHERE users.id = auth.uid()::text
                  AND users.role = 'admin'
                )
              );`
      },
      // Admins can manage all leads
      {
        name: 'Admins can manage all leads',
        sql: `CREATE POLICY "Admins can manage all leads" ON crm_leads
              FOR ALL
              USING (
                EXISTS (
                  SELECT 1 FROM users
                  WHERE users.id = auth.uid()::text
                  AND users.role = 'admin'
                )
              );`
      }
    ]

    const results = []
    for (const policy of policies) {
      console.log(`[SETUP_RLS] Creating policy: ${policy.name}`)

      const result = await supabase.rpc('exec_sql', {
        sql: policy.sql
      })

      if (result.error) {
        console.error(`[SETUP_RLS] Error creating policy "${policy.name}":`, result.error)
        results.push({ policy: policy.name, success: false, error: result.error.message })
      } else {
        console.log(`[SETUP_RLS] Successfully created policy: ${policy.name}`)
        results.push({ policy: policy.name, success: true })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'RLS setup completed',
      results
    })

  } catch (error: any) {
    console.error('[SETUP_RLS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}