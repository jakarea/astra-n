import { NextRequest, NextResponse } from 'next/server'
import { webhookLogger } from '@/lib/webhook-logger'
import { getSessionUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Retrieve webhook logs
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin role required' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const lines = parseInt(url.searchParams.get('lines') || '100')
    const clear = url.searchParams.get('clear') === 'true'

    if (clear) {
      webhookLogger.clearLogs()
      return NextResponse.json({
        success: true,
        message: 'Logs cleared successfully',
        logs: ''
      })
    }

    const logs = webhookLogger.getRecentLogs(lines)
    const logFilePath = webhookLogger.getLogFilePath()

    return NextResponse.json({
      success: true,
      logs,
      logFilePath,
      totalLines: logs.split('\n').length
    })

  } catch (error: any) {
    console.error('Error retrieving webhook logs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Clear logs
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin role required' },
        { status: 403 }
      )
    }

    webhookLogger.clearLogs()

    return NextResponse.json({
      success: true,
      message: 'Logs cleared successfully'
    })

  } catch (error: any) {
    console.error('Error clearing webhook logs:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}