import { NextRequest, NextResponse } from 'next/server'
import { webhookLogger } from '@/lib/webhook-logger'
import { getSessionUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET - Retrieve webhook logs
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lines = parseInt(url.searchParams.get('lines') || '200')
    const format = url.searchParams.get('format') || 'text'

    const logs = webhookLogger.getRecentLogs(lines)

    if (format === 'json') {
      const logLines = logs.split('\n')
      const logEntries = []
      let currentEntry = ''

      for (const line of logLines) {
        if (line.startsWith('🔥 WEBHOOK REQUEST') ||
            line.startsWith('📋 PROCESSING') ||
            line.startsWith('✅ RESPONSE') ||
            line.startsWith('❌ ERROR')) {
          if (currentEntry) {
            logEntries.push(currentEntry.trim())
          }
          currentEntry = line
        } else if (line === '='.repeat(80)) {
          if (currentEntry) {
            logEntries.push(currentEntry.trim())
            currentEntry = ''
          }
        } else {
          currentEntry += '\n' + line
        }
      }

      if (currentEntry) {
        logEntries.push(currentEntry.trim())
      }

      return NextResponse.json({
        success: true,
        logs: logEntries.reverse(), // Most recent first
        total_entries: logEntries.length,
        log_file_path: webhookLogger.getLogFilePath(),
        timestamp: new Date().toISOString()
      })
    }

    // Default: Return human-readable text format
    return new Response(logs, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
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