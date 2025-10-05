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

// Server-side function to get session from request headers
function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase: userSupabase }
  } catch (error) {
    return null
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase: userSupabase } = sessionInfo

    // Get current user to check if admin
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!adminCheck || adminCheck.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const { id: userId } = params
    const { rejection_reason } = await request.json()

    if (!rejection_reason || rejection_reason.trim() === '') {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, account_status')
      .eq('id', userId)
      .single()

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user status to rejected
    const { data, error } = await supabase
      .from('users')
      .update({
        account_status: 'rejected',
        rejection_reason: rejection_reason.trim(),
        approved_at: null,
        approved_by: null
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Clear cache for this user to ensure fresh data on next request
    const { clearUserCache, clearAllCaches } = await import('@/lib/cache-manager')
    clearUserCache(userId)
    // Also clear users list cache since it includes pending users
    clearAllCaches()

    return NextResponse.json({ success: true, user: data, message: 'User rejected successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
