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

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG_CRM_LEADS] Getting all CRM leads...')

    // Get all CRM leads with user info (no filtering)
    const { data: leads, error } = await supabase
      .from('crm_leads')
      .select(`
        id,
        name,
        email,
        phone,
        user_id,
        source,
        logistic_status,
        cod_status,
        kpi_status,
        created_at,
        user:users(id, name, email, role)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DEBUG_CRM_LEADS] Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[DEBUG_CRM_LEADS] Found leads:', leads?.length || 0)

    // Group by user_id to see distribution
    const byUser = leads?.reduce((acc, lead) => {
      const userId = lead.user_id
      if (!acc[userId]) {
        acc[userId] = {
          user: lead.user,
          leads: []
        }
      }
      acc[userId].leads.push(lead)
      return acc
    }, {} as Record<string, any>) || {}

    return NextResponse.json({
      success: true,
      totalLeads: leads?.length || 0,
      leads: leads || [],
      leadsByUser: Object.entries(byUser).map(([userId, data]) => ({
        userId,
        user: data.user,
        leadCount: data.leads.length,
        leads: data.leads
      }))
    })

  } catch (error: any) {
    console.error('[DEBUG_CRM_LEADS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}