import { NextRequest, NextResponse } from 'next/server'

// This is a temporary debug endpoint to capture exactly what WooCommerce sends
// It accepts ALL requests and logs everything for analysis

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const requestId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  try {
    // Capture URL and query parameters
        const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams.entries()))

    // Capture all headers
        const headers = Object.fromEntries(request.headers.entries()))

    // Capture method
    // Capture raw body
    let bodyText = ''
    let parsedBody = null

    try {
      bodyText = await request.text():', bodyText.substring(0, 1000))

      if (bodyText.length > 1000) {')
      }

      // Try to parse as JSON
      if (bodyText) {
        try {
          parsedBody = JSON.parse(bodyText))
        } catch (jsonError) {
          // Try to parse as URL encoded
          try {
            const urlParams = new URLSearchParams(bodyText)
            const formData = Object.fromEntries(urlParams.entries()))
            parsedBody = formData
          } catch (formError) {          }
        }
      } else {      }

    } catch (bodyError) {    }

    // Extract potential webhook secrets
        const potentialSecrets = {
      header_x_webhook_secret: headers['x-webhook-secret'] || null,
      header_x_wc_webhook_signature: headers['x-wc-webhook-signature'] || null,
      header_authorization: headers['authorization'] || null,
      query_webhook_secret: query.webhook_secret || null,
      query_secret: query.secret || null,
      body_webhook_secret: parsedBody?.webhook_secret || null
    })

    // Log content type analysis
        const contentType = headers['content-type'] || ''))))
    // Log user agent and other identifying info)
    // Always return success so WooCommerce doesn't retry
    return NextResponse.json({
      success: true,
      message: 'Debug capture successful',
      debug: {
        requestId,
        timestamp,
        captured: {
          headers: Object.keys(headers).length,
          queryParams: Object.keys(query).length,
          bodyLength: bodyText.length,
          bodyType: parsedBody ? (Array.isArray(parsedBody) ? 'array' : typeof parsedBody) : 'null',
          contentType: contentType || 'empty'
        }
      }
    }, { status: 200 })

  } catch (error: any) {)

    // Still return success to avoid WooCommerce retries
    return NextResponse.json({
      success: false,
      error: 'Debug capture failed',
      message: error.message,
      debug: { requestId, timestamp }
    }, { status: 200 })
  }
}

// Handle other HTTP methods
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'This is a webhook debug capture endpoint. Use POST method.',
    info: 'This endpoint captures and logs all webhook data for debugging purposes.'
  }, { status: 405 })
}

export async function PUT(request: NextRequest) {
  return POST(request) // Capture PUT requests too
}

export async function PATCH(request: NextRequest) {
  return POST(request) // Capture PATCH requests too
}

export async function DELETE(request: NextRequest) {
  return POST(request) // Capture DELETE requests too
}