import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Try both approaches
        const results: any = {
      directConnection: null,
      serviceRoleConnection: null
    }

    // Direct connection
    try {
      const directClient = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await directClient
        .from('users')
        .select('*')

      results.directConnection = {
        success: !error,
        error: error?.message,
        users: data || [],
        count: data?.length || 0
      }
    } catch (error: any) {
      results.directConnection = {
        success: false,
        error: error.message,
        users: [],
        count: 0
      }
    }

    // Service role connection (if available)
    if (supabaseServiceKey) {
      try {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)
        const { data, error } = await adminClient
          .from('users')
          .select('*')

        results.serviceRoleConnection = {
          success: !error,
          error: error?.message,
          users: data || [],
          count: data?.length || 0
        }
      } catch (error: any) {
        results.serviceRoleConnection = {
          success: false,
          error: error.message,
          users: [],
          count: 0
        }
      }
    }

    return NextResponse.json(results)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error.message
    }, { status: 500 })
  }
}