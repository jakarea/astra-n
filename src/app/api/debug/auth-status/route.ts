import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('[AUTH_DEBUG] Starting auth status check')

    // Get auth header
    const authHeader = request.headers.get('authorization')
    console.log('[AUTH_DEBUG] Auth header present:', !!authHeader)

    // Try to get authenticated client
    let hasAuthClient = false
    let authError = null
    let userData = null
    let usersCount = 0

    try {
      const supabase = getAuthenticatedClient()
      hasAuthClient = true
      console.log('[AUTH_DEBUG] Authenticated client created successfully')

      // Try to fetch current user data
      const { data: user, error: userError } = await supabase.auth.getUser()
      if (!userError && user) {
        console.log('[AUTH_DEBUG] Current user:', user.user?.email)

        // Try to get user from database
        const { data: dbUser, error: dbUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.user.id)
          .single()

        if (!dbUserError && dbUser) {
          userData = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role
          }
        }
      }

      // Try to count all users (admin check)
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        usersCount = count || 0
      }

    } catch (error: any) {
      authError = error.message
      console.log('[AUTH_DEBUG] Auth client error:', error.message)
    }

    // Also try direct database connection
    let directDbConnection = false
    let directUsersCount = 0

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const directClient = createClient(supabaseUrl, supabaseAnonKey)
      const { count, error } = await directClient
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (!error) {
        directDbConnection = true
        directUsersCount = count || 0
      }
    } catch (error) {
      console.log('[AUTH_DEBUG] Direct DB connection error:', error)
    }

    const debugInfo = {
      hasAuthHeader: !!authHeader,
      hasAuthClient,
      authError,
      userData,
      usersCount,
      directDbConnection,
      directUsersCount,
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    }

    console.log('[AUTH_DEBUG] Final debug info:', debugInfo)

    return NextResponse.json(debugInfo)

  } catch (error: any) {
    console.error('[AUTH_DEBUG] Unexpected error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}