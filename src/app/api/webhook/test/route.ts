import { NextRequest, NextResponse } from 'next/server'
import { webhookLogger } from '@/lib/webhook-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestId = webhookLogger.logWebhookRequest({
    method: 'GET',
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: { test: 'data' },
    query: Object.fromEntries(request.nextUrl.searchParams.entries())
  })

  webhookLogger.logWebhookProcessing(requestId, 'test_step', { message: 'This is a test log entry.' })
  webhookLogger.logWebhookResponse(requestId, { status: 200, message: 'Test webhook received', processingTime: 10 })

  return NextResponse.json({
    success: true,
    message: 'Test webhook endpoint hit. Check logs for details.',
    requestId: requestId
  })
}