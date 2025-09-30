import { NextRequest, NextResponse } from 'next/server'

/**
 * WooCommerce Webhook Validation Endpoint
 *
 * WooCommerce sends a validation request when saving webhook configuration.
 * This endpoint handles the validation and always returns success.
 */

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK_VALIDATION] WooCommerce validation request received')

  try {
    // Log the validation request details
    const headers = Object.fromEntries(request.headers.entries())
    const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams.entries())

    console.log('[WEBHOOK_VALIDATION] Headers:', JSON.stringify(headers, null, 2))
    console.log('[WEBHOOK_VALIDATION] Query:', JSON.stringify(query, null, 2))

    // Try to read body
    let body = ''
    try {
      body = await request.text()
      console.log('[WEBHOOK_VALIDATION] Body:', body)
    } catch (e) {
      console.log('[WEBHOOK_VALIDATION] No body or body read error')
    }

    // Always return success for validation
    return NextResponse.json({
      success: true,
      message: 'Webhook validation successful',
      endpoint: 'woocommerce-order-integration',
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error: any) {
    console.error('[WEBHOOK_VALIDATION] Error:', error)

    // Still return success to pass validation
    return NextResponse.json({
      success: true,
      message: 'Webhook validation successful (with error handling)',
      error: error.message
    }, { status: 200 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'WooCommerce Webhook Validation Endpoint',
    info: 'This endpoint validates webhook configuration for WooCommerce',
    usage: 'WooCommerce automatically calls this during webhook setup'
  }, { status: 200 })
}

// Handle all other methods
export async function PUT(request: NextRequest) { return POST(request) }
export async function PATCH(request: NextRequest) { return POST(request) }
export async function DELETE(request: NextRequest) { return POST(request) }