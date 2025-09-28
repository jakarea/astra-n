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
    console.log('[DEBUG_CRM_QUERY] Testing exact CRM query...')

    // This is the EXACT same query that the CRM page should be using
    const query = supabase
      .from('crm_leads')
      .select(`
        *,
        user:users(name),
        tags:crm_lead_tags(
          tag:crm_tags(id, name, color)
        )
      `, { count: 'exact' })

    console.log('[DEBUG_CRM_QUERY] Query built - no user_id filtering')

    // Add pagination (same as CRM page)
    const from = 0  // page 1
    const to = 9    // 10 items per page

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    console.log('[DEBUG_CRM_QUERY] Query executed:', {
      data,
      error,
      leadCount: data?.length,
      totalCount: count,
      leads: data?.map(d => ({ id: d.id, name: d.name, user_id: d.user_id }))
    })

    if (error) {
      console.error('[DEBUG_CRM_QUERY] Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      query: 'SELECT * FROM crm_leads (no user_id filter)',
      totalLeads: count || 0,
      leads: data || [],
      leadDetails: data?.map(d => ({
        id: d.id,
        name: d.name,
        user_id: d.user_id,
        user_name: d.user?.name
      })) || []
    })

  } catch (error: any) {
    console.error('[DEBUG_CRM_QUERY] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}