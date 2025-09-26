import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    console.error('[SESSION] Error parsing session from request:', error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log('[ADMIN_USER_BY_ID] Get user by ID API called for:', id)

    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      console.log('[ADMIN_USER_BY_ID] No valid session found in request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user info and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.log('[ADMIN_USER_BY_ID] Invalid token or user not found:', userError?.message)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData || userData.role !== 'admin') {
      console.log('[ADMIN_USER_BY_ID] User is not admin:', userData?.role || 'no role found')
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    console.log('[ADMIN_USER_BY_ID] Admin user authenticated, fetching user:', id)

    // Use service role for admin access
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      console.log('[ADMIN_USER_BY_ID] No service role key, falling back to regular client')
      // Fallback to regular client
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[ADMIN_USER_BY_ID] Regular client error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ user: data })
    }

    // Use service role for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    console.log('[ADMIN_USER_BY_ID] Service role query result:', {
      found: !!data,
      error: error?.message
    })

    if (error) {
      console.error('[ADMIN_USER_BY_ID] Service role error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })

  } catch (error: any) {
    console.error('[ADMIN_USER_BY_ID] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to fetch user',
      details: error.message
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log('[ADMIN_USER_UPDATE] Update user API called for:', id)

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

    const updateData = await request.json()
    console.log('[ADMIN_USER_UPDATE] Updating user with data:', updateData)

    // Use service role for user update
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await serviceClient
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[ADMIN_USER_UPDATE] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })

  } catch (error: any) {
    console.error('[ADMIN_USER_UPDATE] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to update user',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log('[ADMIN_USER_DELETE] Delete user API called for:', id)

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

    // Prevent self-deletion
    if (params.id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Use service role for user deletion
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await serviceClient
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ADMIN_USER_DELETE] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })

  } catch (error: any) {
    console.error('[ADMIN_USER_DELETE] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to delete user',
      details: error.message
    }, { status: 500 })
  }
}