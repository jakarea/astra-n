import { NextRequest, NextResponse } from 'next/server'
import { webhookLogger } from '@/lib/webhook-logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('🧪 TEST WEBHOOK RECEIVED')
  console.log('⏰ Time:', new Date().toLocaleString())
  
  try {
    const requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: { test: 'webhook test data' },
      query: {}
    })

    webhookLogger.logWebhookProcessing(requestId, 'test_processing', {
      message: 'Test webhook processing successfully'
    })

    webhookLogger.logWebhookResponse(requestId, {
      status: 200,
      message: 'Test webhook completed successfully',
      data: { test: true, timestamp: new Date().toISOString() },
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Test webhook completed successfully',
      timestamp: new Date().toISOString(),
      requestId
    })

  } catch (error: any) {
    console.error('❌ Test webhook error:', error)
    
    webhookLogger.logWebhookError('test-error', {
      error: 'Test webhook failed',
      message: error.message,
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test webhook endpoint - send POST request to test',
    usage: 'POST /api/webhook/test'
  })
}
