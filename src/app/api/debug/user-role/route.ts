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
    console.log('[DEBUG_USER_ROLE] Getting user roles...')

    // Get all users and their roles
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DEBUG_USER_ROLE] Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[DEBUG_USER_ROLE] Found users:', users)

    return NextResponse.json({
      success: true,
      users: users || [],
      adminUsers: users?.filter(u => u.role === 'admin') || [],
      sellerUsers: users?.filter(u => u.role === 'seller') || []
    })

  } catch (error: any) {
    console.error('[DEBUG_USER_ROLE] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}