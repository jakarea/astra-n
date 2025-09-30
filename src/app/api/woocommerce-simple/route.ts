import { NextRequest, NextResponse } from 'next/server'

/**
 * Ultra-Simple WooCommerce Webhook Endpoint
 *
 * This endpoint is designed to ALWAYS return 200 OK to allow
 * WooCommerce webhook configuration to save successfully.
 * Use this for initial setup, then switch to the full endpoint.
 */

export async function POST(request: NextRequest) {
  console.log('[SIMPLE_WEBHOOK] WooCommerce webhook received')

  try {
    // Log basic info
    const headers = Object.fromEntries(request.headers.entries())
    console.log('[SIMPLE_WEBHOOK] User-Agent:', headers['user-agent'] || 'None')
    console.log('[SIMPLE_WEBHOOK] Content-Type:', headers['content-type'] || 'None')

    // Try to read body
    let bodyText = ''
    try {
      bodyText = await request.text()
      console.log('[SIMPLE_WEBHOOK] Body length:', bodyText.length)

      if (bodyText.length > 0) {
        console.log('[SIMPLE_WEBHOOK] Body preview:', bodyText.substring(0, 200))
      }
    } catch (e) {
      console.log('[SIMPLE_WEBHOOK] Could not read body')
    }

    // Always return success
    return NextResponse.json({
      success: true,
      message: 'Simple WooCommerce webhook received successfully',
      timestamp: new Date().toISOString(),
      endpoint: 'ultra-simple',
      received_data: bodyText.length > 0
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error: any) {
    console.error('[SIMPLE_WEBHOOK] Error (but still returning success):', error)

    // Even on error, return success to allow WooCommerce config
    return NextResponse.json({
      success: true,
      message: 'Simple webhook processed with error handling',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}

// Handle GET requests too
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'WooCommerce Simple Webhook Endpoint',
    info: 'This endpoint always returns 200 OK to help with WooCommerce configuration',
    usage: 'Use this URL in WooCommerce webhook settings for initial setup',
    url: 'https://astra-n.vercel.app/api/woocommerce-simple'
  }, { status: 200 })
}

// Handle all other methods
export async function PUT(request: NextRequest) { return POST(request) }
export async function PATCH(request: NextRequest) { return POST(request) }
export async function DELETE(request: NextRequest) { return POST(request) }
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret'
    }
  })
}