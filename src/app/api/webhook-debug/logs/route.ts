import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { webhookLogger } from '@/lib/webhook-logger'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lines = parseInt(url.searchParams.get('lines') || '200')
    const format = url.searchParams.get('format') || 'text'

    // Since we're using console-only logging, return a helpful message
    const logs = webhookLogger.getRecentLogs(lines)

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        logs: [logs],
        total_entries: 1,
        log_file_path: 'console-only',
        timestamp: new Date().toISOString(),
        message: 'Console-only logging enabled. Check Vercel function logs for webhook details.'
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
    return NextResponse.json(
      {
        error: 'Failed to retrieve logs',
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
        const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    webhookLogger.clearLogs()

    return NextResponse.json({
      success: true,
      message: 'Webhook logs cleared successfully'
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to clear logs',
        message: error.message
      },
      { status: 500 }
    )
  }
}