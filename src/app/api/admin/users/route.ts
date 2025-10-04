import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedClient } from '@/lib/auth'
import { getUsersCache, setUsersCache } from '@/lib/cache-manager'

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
    if (!sessionInfo) {      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { token: _token, supabase } = sessionInfo

    // Get current user info
        const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get user role from database
        const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    // Create cache key based on query parameters
    const cacheKey = `${page}-${search}-${limit}`

    // Check cache first (only for non-search queries on first page)
    if (!search && page === 1) {
      const cachedData = getUsersCache()
      if (cachedData) {
        return NextResponse.json(cachedData)
      }
    }

    // For admin users, use service role to bypass RLS
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      // Fallback to regular client
        const supabase = getAuthenticatedClient()

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })

      if (search && search.length >= 3) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        users: data || [],
        totalCount: count || 0,
        page,
        limit,
        method: 'regular_client'
      })
    }

    // Use service role for admin access
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    let query = serviceClient
      .from('users')
      .select('*', { count: 'exact' })

    // Add search filters if search query exists and has 3+ characters
    if (search && search.length >= 3) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Add pagination
        const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const responseData = {
      users: data || [],
      totalCount: count || 0,
      page,
      limit,
      method: 'service_role'
    }

    // Cache the response only for first page without search
    if (!search && page === 1) {
      setUsersCache(responseData)
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { data: userRole, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    const userData = await request.json()
    // Use service role for user creation
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await serviceClient
      .from('users')
      .insert([userData])
      .select()
      .single()

    if (error) {      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to create user',
      details: error.message
    }, { status: 500 })
  }
}