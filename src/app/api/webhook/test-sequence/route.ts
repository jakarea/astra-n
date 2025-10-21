import { NextRequest, NextResponse } from 'next/server'

// Disable all caching for webhook endpoints
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const uniqueRequestId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    const body = await request.json()
    
    console.log('🧪 WEBHOOK TEST RECEIVED')
    console.log('🆔 Request ID:', uniqueRequestId)
    console.log('⏰ Time:', new Date().toLocaleString())
    console.log('📋 Body:', JSON.stringify(body, null, 2))
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook received',
      requestId: uniqueRequestId,
      receivedAt: new Date().toISOString(),
      processingTime: Date.now() - startTime
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
    
  } catch (error: any) {
    console.error('❌ Test webhook error:', error)
    
    return NextResponse.json({
      error: 'Test webhook failed',
      message: error.message,
      requestId: uniqueRequestId
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint - use POST to test',
    endpoint: '/api/webhook/test-sequence'
  })
}
