import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserStatsCache, setUserStatsCache } from '@/lib/cache-manager'

// Server-side function to get session from request headers
function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    // Create a Supabase client with this token to verify and get user info
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user info and verify admin role
        const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    // Check cache first
    const cachedStats = getUserStatsCache()
    if (cachedStats) {
      return NextResponse.json(cachedStats)
    }

    // Use service role for admin access
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: statsData, error: statsError } = await serviceClient
      .from('users')
      .select('role')

    if (statsError) {      return NextResponse.json({ error: statsError.message }, { status: 500 })
    }

    const stats = {
      total: statsData?.length || 0,
      active: statsData?.length || 0, // All users in DB are considered active
      inactive: 0, // We don't have inactive status in current schema
      admins: statsData?.filter(u => u.role === 'admin').length || 0,
      pending: 0 // We don't have pending status in current schema, but include for consistency
    }

    const responseData = { stats }

    // Cache the stats
    setUserStatsCache(responseData)

    return NextResponse.json(responseData)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch user statistics',
      details: error.message
    }, { status: 500 })
  }
}