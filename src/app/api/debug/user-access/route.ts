import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('[USER_ACCESS] Testing user access levels')

    const session = getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('[USER_ACCESS] Current user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    })

    // Test with authenticated client (what the UI is using)
    const supabase = getAuthenticatedClient()

    const { data: authUsers, error: authError, count: authCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    console.log('[USER_ACCESS] Authenticated client result:', {
      userCount: authUsers?.length || 0,
      totalCount: authCount || 0,
      error: authError?.message,
      users: authUsers?.map(u => ({ id: u.id, email: u.email, role: u.role }))
    })

    // Test with service role (what we know works)
    let serviceUsers = null
    let serviceError = null
    let serviceCount = 0

    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseServiceKey) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

      const { data: sData, error: sError, count: sCount } = await serviceClient
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      serviceUsers = sData?.map(u => ({ id: u.id, email: u.email, role: u.role }))
      serviceError = sError?.message
      serviceCount = sCount || 0

      console.log('[USER_ACCESS] Service role result:', {
        userCount: sData?.length || 0,
        totalCount: sCount || 0,
        error: sError?.message
      })
    }

    return NextResponse.json({
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      },
      authenticatedAccess: {
        success: !authError,
        error: authError?.message,
        userCount: authUsers?.length || 0,
        totalCount: authCount || 0,
        users: authUsers?.map(u => ({ id: u.id, email: u.email, role: u.role })) || []
      },
      serviceRoleAccess: {
        success: !serviceError,
        error: serviceError,
        userCount: serviceUsers?.length || 0,
        totalCount: serviceCount,
        users: serviceUsers || []
      }
    })

  } catch (error: any) {
    console.error('[USER_ACCESS] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to test user access',
      details: error.message
    }, { status: 500 })
  }
}