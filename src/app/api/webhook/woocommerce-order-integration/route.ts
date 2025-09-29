import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderNotification } from '@/lib/telegram'
import { webhookLogger } from '@/lib/webhook-logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface WooCommerceOrderPayload {
  id: number
  status: string
  currency: string
  date_created: string
  total: string
  customer_id: number
  billing: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
    company?: string
  }
  shipping: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postcode: string
    country: string
    company?: string
  }
  line_items: Array<{
    id: number
    name: string
    product_id: number
    quantity: number
    sku: string
    price: number
    total: string
  }>
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let requestId: string

  try {
    // First, capture all raw request data for logging
    const url = new URL(request.url)
    const headers = Object.fromEntries(request.headers.entries())
    const query = Object.fromEntries(url.searchParams.entries())

    let body: any
    let bodyText = ''

    try {
      bodyText = await request.text()
      body = bodyText ? JSON.parse(bodyText) : {}
    } catch (jsonError) {
      // Log the raw request even if JSON parsing fails
      requestId = webhookLogger.logWebhookRequest({
        method: request.method,
        url: request.url,
        headers,
        body: { raw_body: bodyText, json_parse_error: jsonError.message },
        query
      })

      const processingTime = Date.now() - startTime
      webhookLogger.logWebhookError(requestId, {
        message: 'Invalid JSON in request body',
        status: 400,
        processingTime
      })

      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
          debug: {
            requestId,
            raw_body_preview: bodyText.substring(0, 500),
            content_type: headers['content-type'],
            content_length: headers['content-length']
          }
        },
        { status: 400 }
      )
    }

    // Log the complete request
    requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url: request.url,
      headers,
      body,
      query
    })

    const contentType = request.headers.get('content-type') || ''

    // Be more flexible with content types - WooCommerce can send various formats
    const isValidContentType =
      contentType.includes('application/json') ||
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType === '' || // Some webhooks don't set content-type
      contentType.includes('text/plain') // WooCommerce sometimes uses this

    if (!isValidContentType) {
      const processingTime = Date.now() - startTime
      webhookLogger.logWebhookError(requestId, {
        message: `Unsupported content type: ${contentType}`,
        status: 400,
        processingTime
      })

      return NextResponse.json(
        {
          error: 'Unsupported content type',
          message: 'Content-Type must be application/json, application/x-www-form-urlencoded, text/plain, or empty',
          debug: {
            requestId,
            received_content_type: contentType,
            supported_types: ['application/json', 'application/x-www-form-urlencoded', 'text/plain', '(empty)']
          }
        },
        { status: 400 }
      )
    }

    webhookLogger.logWebhookProcessing(requestId, {
      processing: 'Content type validation passed, extracting webhook secret',
      contentType,
      isValidContentType
    })

    // Validate webhook secret from multiple sources
    let webhookSecret =
      request.headers.get('x-webhook-secret') || // Custom header (if supported)
      request.headers.get('x-wc-webhook-signature') || // WooCommerce signature header
      query.webhook_secret || // Query parameter
      query.secret || // Alternative query parameter
      body?.webhook_secret // In request body

    const secretSources = {
      header_x_webhook_secret: !!request.headers.get('x-webhook-secret'),
      header_x_wc_webhook_signature: !!request.headers.get('x-wc-webhook-signature'),
      query_webhook_secret: !!query.webhook_secret,
      query_secret: !!query.secret,
      body_webhook_secret: !!body?.webhook_secret,
      final_secret_found: !!webhookSecret,
      webhook_secret_type: webhookSecret ? typeof webhookSecret : 'undefined',
      webhook_secret_length: webhookSecret ? webhookSecret.length : 0
    }

    webhookLogger.logWebhookProcessing(requestId, {
      processing: 'Webhook secret extraction completed',
      secretSources,
      all_headers: Object.keys(headers),
      all_query_params: Object.keys(query)
    })

    // If we have WooCommerce signature, extract the secret from it
    if (request.headers.get('x-wc-webhook-signature') && !webhookSecret) {
      webhookLogger.logWebhookProcessing(requestId, {
        processing: 'WooCommerce signature detected, will validate against database'
      })
    }

    if (!webhookSecret || typeof webhookSecret !== 'string') {
      const processingTime = Date.now() - startTime
      webhookLogger.logWebhookError(requestId, {
        message: 'Missing webhook secret in all sources',
        status: 401,
        processingTime,
        secretSources
      })

      return NextResponse.json(
        {
          error: 'Missing webhook secret',
          message: 'Webhook secret is required. Please provide it via x-webhook-secret header, webhook_secret query parameter, or in request body',
          debug: {
            requestId,
            secretSources,
            available_headers: Object.keys(headers),
            available_query_params: Object.keys(query),
            body_keys: Object.keys(body || {})
          }
        },
        { status: 401 }
      )
    }

    webhookLogger.logWebhookProcessing(requestId, {
      processing: 'Webhook secret validation passed, looking up integration',
      webhookSecret
    })

    // Find integration by webhook secret
    console.log('[WOOCOMMERCE_WEBHOOK] Looking up integration with webhook secret')
    let integration
    let integrationError

    // Try to find integration with exact webhook secret match
    const integrationResult = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, status, is_active, webhook_secret')
      .eq('webhook_secret', webhookSecret)
      .eq('type', 'woocommerce')
      .single()

    integration = integrationResult.data
    integrationError = integrationResult.error

    // If no exact match and we have a WooCommerce signature, validate against all WooCommerce integrations
    if (!integration && request.headers.get('x-wc-webhook-signature')) {
      console.log('[WOOCOMMERCE_WEBHOOK] No exact match found, trying WooCommerce signature validation')

      const { data: allIntegrations } = await supabaseAdmin
        .from('integrations')
        .select('id, user_id, name, status, is_active, webhook_secret')
        .eq('type', 'woocommerce')
        .eq('is_active', true)

      if (allIntegrations) {
        const signature = request.headers.get('x-wc-webhook-signature')
        const rawBody = JSON.stringify(body)

        // Try to validate signature against each integration's secret
        for (const testIntegration of allIntegrations) {
          if (testIntegration.webhook_secret) {
            try {
              const crypto = require('crypto')
              const expectedSignature = crypto
                .createHmac('sha256', testIntegration.webhook_secret)
                .update(rawBody, 'utf8')
                .digest('base64')

              if (signature === expectedSignature) {
                console.log('[WOOCOMMERCE_WEBHOOK] Valid WooCommerce signature found for integration:', testIntegration.id)
                integration = testIntegration
                break
              }
            } catch (error) {
              console.error('[WOOCOMMERCE_WEBHOOK] Error validating signature:', error)
            }
          }
        }
      }
    }

    if (integrationError || !integration) {
      const processingTime = Date.now() - startTime
      webhookLogger.logWebhookError(requestId, {
        message: 'Integration lookup failed',
        status: 401,
        processingTime,
        integrationError: integrationError?.message || 'No integration found',
        webhookSecret
      })

      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid, does not exist, or signature validation failed',
          debug: {
            requestId,
            integration_error: integrationError?.message,
            webhook_secret_length: webhookSecret.length,
            webhook_secret_prefix: webhookSecret.substring(0, 8) + '...'
          }
        },
        { status: 401 }
      )
    }

    webhookLogger.logWebhookProcessing(requestId, {
      processing: 'Integration found successfully',
      integration: {
        id: integration.id,
        userId: integration.user_id,
        name: integration.name,
        status: integration.status,
        isActive: integration.is_active
      }
    })

    console.log('[WOOCOMMERCE_WEBHOOK] Integration found:', {
      id: integration.id,
      userId: integration.user_id,
      name: integration.name,
      status: integration.status,
      isActive: integration.is_active
    })

    // Validate that we have a valid user_id from webhook secret
    if (!integration.user_id) {
      console.error('[WOOCOMMERCE_WEBHOOK] No user_id found for integration')
      return NextResponse.json(
        {
          error: 'Invalid integration',
          message: 'Integration does not have a valid user_id'
        },
        { status: 400 }
      )
    }

    console.log('[WOOCOMMERCE_WEBHOOK] User identified from webhook secret:', integration.user_id)

    // Extract customer data
    const customerName = `${body.billing.first_name} ${body.billing.last_name}`.trim()
    const customerEmail = body.billing.email
    const customerPhone = body.billing.phone
    const customerAddress = {
      billing: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        company: body.billing.company || '',
        address_1: body.billing.address_1,
        address_2: body.billing.address_2 || '',
        city: body.billing.city,
        state: body.billing.state,
        postcode: body.billing.postcode,
        country: body.billing.country,
        phone: body.billing.phone
      },
      shipping: {
        first_name: body.shipping.first_name,
        last_name: body.shipping.last_name,
        company: body.shipping.company || '',
        address_1: body.shipping.address_1,
        address_2: body.shipping.address_2 || '',
        city: body.shipping.city,
        state: body.shipping.state,
        postcode: body.shipping.postcode,
        country: body.shipping.country
      }
    }

    // Step 1: Check if order already exists first
    const externalOrderId = body.id.toString()
    const { data: existingOrder, error: _orderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id')
      .eq('integration_id', integration.id)
      .eq('external_order_id', externalOrderId)
      .single()

    let customer
    let isNewOrder = !existingOrder

    // Step 2: Handle Customer (only increment total_order for new orders)
    const { data: existingCustomer, error: _customerLookupError } = await supabaseAdmin
      .from('customers')
      .select('id, total_order')
      .eq('email', customerEmail)
      .eq('user_id', integration.user_id)
      .single()

    if (existingCustomer) {
      // Update existing customer, increment total_order only for new orders
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          name: customerName,
          phone: customerPhone || null,
          address: customerAddress,
          total_order: isNewOrder ? existingCustomer.total_order + 1 : existingCustomer.total_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (updateError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Customer update error:', updateError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to update customer'
          },
          { status: 500 }
        )
      }
      customer = updatedCustomer
    } else {
      // Create new customer (new customers always start with total_order: 1)
      const { data: newCustomer, error: insertError } = await supabaseAdmin
        .from('customers')
        .insert([{
          user_id: integration.user_id,
          name: customerName,
          email: customerEmail,
          phone: customerPhone || null,
          address: customerAddress,
          source: 'woocommerce',
          total_order: 1
        }])
        .select()
        .single()

      if (insertError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Customer insert error:', insertError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create customer'
          },
          { status: 500 }
        )
      }
      customer = newCustomer
    }

    // Step 3: Upsert Order
    const orderCreatedAt = new Date(body.date_created).toISOString()
    const totalAmount = parseFloat(body.total)

    let order
    if (existingOrder) {
      // Update existing order
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          user_id: integration.user_id,
          customer_id: customer.id,
          status: body.status,
          total_amount: totalAmount,
          order_created_at: orderCreatedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)
        .select()
        .single()

      if (updateError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Order update error:', updateError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to update order'
          },
          { status: 500 }
        )
      }
      order = updatedOrder
    } else {
      // Create new order
      const { data: newOrder, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert([{
          user_id: integration.user_id,
          integration_id: integration.id,
          customer_id: customer.id,
          external_order_id: externalOrderId,
          status: body.status,
          total_amount: totalAmount,
          order_created_at: orderCreatedAt
        }])
        .select()
        .single()

      if (insertError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Order insert error:', insertError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order'
          },
          { status: 500 }
        )
      }
      order = newOrder
    }

    // Step 4: Handle Order Items
    if (existingOrder) {
      // Delete existing order items for updates
      const { error: deleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', order.id)

      if (deleteError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Order items delete error:', deleteError)
      }
    }

    // Insert new order items
    const orderItems = body.line_items.map(item => ({
      order_id: order.id,
      product_sku: item.sku || '',
      product_name: item.name,
      quantity: item.quantity,
      price_per_unit: item.price
    }))

    if (orderItems.length > 0) {
      const { error: itemsInsertError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsInsertError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Order items insert error:', itemsInsertError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order items'
          },
          { status: 500 }
        )
      }
    }

    console.log('[WOOCOMMERCE_WEBHOOK] Order processed successfully:', {
      orderId: order.id,
      customerId: customer.id,
      externalOrderId,
      itemsCount: orderItems.length
    })

    // Step 5: Send Telegram Notification (for both create and update)
    try {
      // User identified from webhook secret -> integration lookup
      const notificationUserId = integration.user_id
      console.log('[WOOCOMMERCE_WEBHOOK] Telegram notification target user (from webhook secret):', notificationUserId)

      // Send Telegram notification (non-blocking)
      const orderData = {
        externalOrderId,
        customer: {
          name: customerName,
          email: customerEmail
        },
        totalAmount: body.total,
        status: body.status,
        orderCreatedAt: body.date_created,
        items: body.line_items.map(item => ({
          productName: item.name,
          quantity: item.quantity,
          pricePerUnit: item.total
        })),
        isUpdate: !isNewOrder
      }

      console.log('[WOOCOMMERCE_WEBHOOK] Order data for notification:', JSON.stringify(orderData, null, 2))

      sendOrderNotification(notificationUserId, orderData).then((result) => {
        console.log('[WOOCOMMERCE_WEBHOOK] Telegram notification result:', result)
        if (!result.success) {
          console.error('[WOOCOMMERCE_WEBHOOK] Telegram notification failed:', result.error)
        }
      }).catch((error) => {
        console.error('[WOOCOMMERCE_WEBHOOK] Telegram notification error:', error)
      })
    } catch (telegramError) {
      console.error('[WOOCOMMERCE_WEBHOOK] Telegram notification error:', telegramError)
      // Don't fail the webhook if Telegram notification fails
    }

    const processingTime = Date.now() - startTime
    const responseData = {
      success: true,
      message: 'WooCommerce order processed successfully',
      data: {
        orderId: order.id,
        customerId: customer.id,
        externalOrderId,
        status: body.status,
        totalAmount,
        itemsCount: orderItems.length
      }
    }

    webhookLogger.logWebhookResponse(requestId, {
      status: 200,
      message: 'Order processed successfully',
      data: responseData.data,
      processingTime
    })

    return NextResponse.json(responseData, { status: 200 })

  } catch (error: any) {
    const processingTime = Date.now() - startTime

    webhookLogger.logWebhookError(requestId || 'unknown', {
      message: `Unexpected error: ${error.message}`,
      stack: error.stack,
      status: 500,
      processingTime
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook',
        debug: {
          requestId: requestId || 'unknown',
          error_message: error.message,
          processing_time: processingTime
        }
      },
      { status: 500 }
    )
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}