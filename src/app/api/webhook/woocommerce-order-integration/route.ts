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
  const timestamp = new Date().toISOString()

  console.log('🔔 ====== WEBHOOK REQUEST ======')
  console.log('🔔 Time:', timestamp)

  try {
    // Capture request details for logging
    const headers = Object.fromEntries(request.headers.entries())
    const url = request.url
    const contentType = request.headers.get('content-type') || ''

    // Parse request body based on content type
    let body: any
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form-urlencoded (ping requests)
      const text = await request.text()
      const params = new URLSearchParams(text)
      body = Object.fromEntries(params.entries())
    } else {
      // Handle JSON (actual order webhooks)
      body = await request.json()
    }

    // Log complete request to test-logger
    const requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url,
      headers,
      body,
      query: {}
    })

    console.log('🔔 Request ID:', requestId)
    console.log('🔔 Topic:', request.headers.get('x-wc-webhook-topic'))
    console.log('🔔 Order ID:', body.id)

    // Handle ping event
    const topic = request.headers.get('x-wc-webhook-topic')
    if (topic === 'ping' || body.webhook_id || !body.id) {
      console.log('✅ Ping event received')

      webhookLogger.logWebhookResponse(requestId, {
        status: 200,
        message: 'Ping event handled',
        data: { topic, webhook_id: body.webhook_id },
        processingTime: Date.now() - startTime
      })

      return NextResponse.json({
        success: true,
        message: 'Pong! Webhook endpoint is working'
      })
    }

    // Get the first active WooCommerce integration
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id')
      .eq('type', 'woocommerce')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!integration) {
      webhookLogger.logWebhookError(requestId, {
        error: 'No active WooCommerce integration found',
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({
        error: 'No active WooCommerce integration found'
      }, { status: 404 })
    }

    console.log('🔔 Integration found:', integration.id)
    webhookLogger.logWebhookProcessing(requestId, 'integration_found', {
      integration_id: integration.id,
      user_id: integration.user_id
    })

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
    console.log('🔔 Checking for existing order with external ID:', externalOrderId)

    const { data: existingOrder, error: _orderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id')
      .eq('integration_id', integration.id)
      .eq('external_order_id', externalOrderId)
      .single()

    console.log('🔔 Existing order:', existingOrder ? `Found (ID: ${existingOrder.id})` : 'Not found')

    let customer
    let isNewOrder = !existingOrder

    // Step 2: Handle Customer (only increment total_order for new orders)
    console.log('🔔 Looking for customer with email:', customerEmail)

    const { data: existingCustomer, error: _customerLookupError } = await supabaseAdmin
      .from('customers')
      .select('id, total_order')
      .eq('email', customerEmail)
      .eq('user_id', integration.user_id)
      .single()

    console.log('🔔 Existing customer:', existingCustomer ? `Found (ID: ${existingCustomer.id})` : 'Not found')

    if (existingCustomer) {
      console.log('🔔 Updating existing customer...')
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
        console.error('🔔 ❌ Failed to update customer:', updateError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to update customer',
          details: updateError,
          customer_email: customerEmail
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to update customer'
          },
          { status: 500 }
        )
      }
      console.log('🔔 ✅ Customer updated successfully')
      webhookLogger.logWebhookProcessing(requestId, 'customer_updated', {
        customer_id: updatedCustomer.id,
        customer_email: customerEmail,
        total_order: updatedCustomer.total_order
      })
      customer = updatedCustomer
    } else {
      console.log('🔔 Creating new customer...')
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
        console.error('🔔 ❌ Failed to create customer:', insertError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to create customer',
          details: insertError,
          customer_email: customerEmail
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create customer'
          },
          { status: 500 }
        )
      }
      console.log('🔔 ✅ New customer created successfully')
      webhookLogger.logWebhookProcessing(requestId, 'customer_created', {
        customer_id: newCustomer.id,
        customer_email: customerEmail,
        total_order: newCustomer.total_order
      })
      customer = newCustomer
    }

    // Step 3: Upsert Order
    console.log('🔔 Processing order...', isNewOrder ? 'Creating new order' : 'Updating existing order')
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
        console.error('🔔 ❌ Failed to update order:', updateError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to update order',
          details: updateError,
          external_order_id: externalOrderId
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to update order'
          },
          { status: 500 }
        )
      }
      console.log('🔔 ✅ Order updated successfully')
      webhookLogger.logWebhookProcessing(requestId, 'order_updated', {
        order_id: updatedOrder.id,
        external_order_id: externalOrderId,
        status: updatedOrder.status,
        total_amount: updatedOrder.total_amount
      })
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
        console.error('🔔 ❌ Failed to create order:', insertError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to create order',
          details: insertError,
          external_order_id: externalOrderId
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order'
          },
          { status: 500 }
        )
      }
      console.log('🔔 ✅ New order created successfully')
      webhookLogger.logWebhookProcessing(requestId, 'order_created', {
        order_id: newOrder.id,
        external_order_id: externalOrderId,
        status: newOrder.status,
        total_amount: newOrder.total_amount
      })
      order = newOrder
    }

    // Step 4: Handle Order Items
    console.log('🔔 Processing order items... Count:', body.line_items.length)
    if (existingOrder) {
      // Delete existing order items for updates
        const { error: deleteError } = await supabaseAdmin
        .from('order_items')
        .delete()
        .eq('order_id', order.id)

      if (deleteError) {      }
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
        console.error('🔔 ❌ Failed to create order items:', itemsInsertError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to create order items',
          details: itemsInsertError,
          order_id: order.id
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order items'
          },
          { status: 500 }
        )
      }
      console.log('🔔 ✅ Order items saved successfully')
      webhookLogger.logWebhookProcessing(requestId, 'order_items_saved', {
        order_id: order.id,
        items_count: orderItems.length
      })
    }
    // Send Telegram notification (non-blocking)
    try {
      const orderData = {
        externalOrderId,
        customer: { name: customerName, email: customerEmail },
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
      sendOrderNotification(integration.user_id, orderData).catch(() => {})
    } catch {}

    console.log('✅ Order processed:', order.id, 'Customer:', customer.id, 'Time:', Date.now() - startTime + 'ms')

    webhookLogger.logWebhookResponse(requestId, {
      status: 200,
      message: 'Order processed successfully',
      data: {
        order_id: order.id,
        customer_id: customer.id,
        external_order_id: externalOrderId,
        is_new_order: isNewOrder
      },
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      orderId: order.id,
      customerId: customer.id
    })

  } catch (error: any) {
    console.error('❌ Webhook error:', error.message)

    // Log error if requestId exists
    try {
      const headers = Object.fromEntries(request.headers.entries())
      const url = request.url
      const requestId = webhookLogger.logWebhookRequest({
        method: request.method,
        url,
        headers,
        body: {},
        query: {}
      })

      webhookLogger.logWebhookError(requestId, {
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    } catch {}

    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json(
    {
      success: true,
      message: 'CORS preflight successful'
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-wc-webhook-signature, x-wc-webhook-topic, x-webhook-secret',
      }
    }
  )
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint. Use POST to send webhook data.',
      accepted_methods: ['POST', 'OPTIONS']
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