import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCrmCache, setCrmCache } from '@/lib/cache-manager'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  // Check cache first using centralized cache manager
        const cachedData = getCrmCache()
  if (cachedData) {    return NextResponse.json(cachedData)
  }
  try {
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

    if (error) {      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }
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

    const responseData = {
      success: true,
      totalLeads: leads?.length || 0,
      leads: leads || [],
      leadsByUser: Object.entries(byUser).map(([userId, data]) => ({
        userId,
        user: data.user,
        leadCount: data.leads.length,
        leads: data.leads
      }))
    }

    // Cache the data using centralized cache manager
    setCrmCache(responseData)

    return NextResponse.json(responseData)

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}