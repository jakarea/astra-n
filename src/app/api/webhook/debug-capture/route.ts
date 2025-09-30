import { NextRequest, NextResponse } from 'next/server'

// This is a temporary debug endpoint to capture exactly what WooCommerce sends
// It accepts ALL requests and logs everything for analysis

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const requestId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  console.log(`\n🔍 [WEBHOOK_DEBUG_CAPTURE] ${requestId} - ${timestamp}`)
  console.log('='.repeat(80))

  try {
    // Capture URL and query parameters
    const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams.entries())

    console.log('📡 REQUEST URL:', request.url)
    console.log('🔗 QUERY PARAMS:', JSON.stringify(query, null, 2))

    // Capture all headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log('📋 HEADERS:', JSON.stringify(headers, null, 2))

    // Capture method
    console.log('🎯 METHOD:', request.method)

    // Capture raw body
    let bodyText = ''
    let parsedBody = null

    try {
      bodyText = await request.text()
      console.log('📦 RAW BODY LENGTH:', bodyText.length)
      console.log('📦 RAW BODY (first 1000 chars):', bodyText.substring(0, 1000))

      if (bodyText.length > 1000) {
        console.log('📦 RAW BODY (truncated, full body above)')
      }

      // Try to parse as JSON
      if (bodyText) {
        try {
          parsedBody = JSON.parse(bodyText)
          console.log('✅ JSON PARSE SUCCESS')
          console.log('📝 PARSED BODY:', JSON.stringify(parsedBody, null, 2))
        } catch (jsonError) {
          console.log('❌ JSON PARSE FAILED:', jsonError.message)

          // Try to parse as URL encoded
          try {
            const urlParams = new URLSearchParams(bodyText)
            const formData = Object.fromEntries(urlParams.entries())
            console.log('✅ URL-ENCODED PARSE SUCCESS')
            console.log('📝 FORM DATA:', JSON.stringify(formData, null, 2))
            parsedBody = formData
          } catch (formError) {
            console.log('❌ URL-ENCODED PARSE FAILED:', formError.message)
          }
        }
      } else {
        console.log('📝 EMPTY BODY')
      }

    } catch (bodyError) {
      console.log('❌ BODY READ ERROR:', bodyError.message)
    }

    // Extract potential webhook secrets
    const potentialSecrets = {
      header_x_webhook_secret: headers['x-webhook-secret'] || null,
      header_x_wc_webhook_signature: headers['x-wc-webhook-signature'] || null,
      header_authorization: headers['authorization'] || null,
      query_webhook_secret: query.webhook_secret || null,
      query_secret: query.secret || null,
      body_webhook_secret: parsedBody?.webhook_secret || null
    }

    console.log('🔐 POTENTIAL SECRETS:', JSON.stringify(potentialSecrets, null, 2))

    // Log content type analysis
    const contentType = headers['content-type'] || ''
    console.log('🏷️  CONTENT TYPE ANALYSIS:')
    console.log('   Raw:', contentType)
    console.log('   Is JSON:', contentType.includes('application/json'))
    console.log('   Is Form:', contentType.includes('application/x-www-form-urlencoded'))
    console.log('   Is Text:', contentType.includes('text/plain'))
    console.log('   Is Multipart:', contentType.includes('multipart/form-data'))
    console.log('   Is Empty:', contentType === '')

    // Log user agent and other identifying info
    console.log('🤖 USER AGENT:', headers['user-agent'] || 'Not provided')
    console.log('🌐 HOST:', headers['host'] || 'Not provided')
    console.log('📡 X-FORWARDED-FOR:', headers['x-forwarded-for'] || 'Not provided')

    console.log('='.repeat(80))
    console.log(`✅ [WEBHOOK_DEBUG_CAPTURE] ${requestId} - Logged successfully\n`)

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

  } catch (error: any) {
    console.error(`❌ [WEBHOOK_DEBUG_CAPTURE] ${requestId} - ERROR:`, error)
    console.log('='.repeat(80))

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