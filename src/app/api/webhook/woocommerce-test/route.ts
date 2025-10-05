import { NextRequest, NextResponse } from 'next/server'

// Simple test endpoint for WooCommerce webhook validation
// No authentication, no validation - just accepts everything

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    console.log('🎯 WooCommerce Test Webhook Received:', {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body
    })

    return NextResponse.json({
      success: true,
      message: 'WooCommerce webhook test successful!',
      received_at: new Date().toISOString(),
      body_preview: body
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    })
  } catch (error: any) {
    console.error('Test webhook error:', error)

    return NextResponse.json({
      success: true,
      message: 'Received but failed to parse',
      error: error.message
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WooCommerce Test Webhook Endpoint',
    instructions: 'Send POST request to test webhook delivery',
    test_url: 'https://astra-n.vercel.app/api/webhook/woocommerce-test'
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  })
}
