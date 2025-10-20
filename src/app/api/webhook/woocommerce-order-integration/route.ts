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
  
  // Immediate console log for debugging
  console.log('🚨 WEBHOOK RECEIVED - WooCommerce Order Integration')
  console.log('⏰ Time:', new Date().toLocaleString())
  console.log('🌐 URL:', request.url)
  console.log('🔗 Method:', request.method)

  try {
    // Capture request details for logging
    const headers = Object.fromEntries(request.headers.entries())
    const url = request.url
    const contentType = request.headers.get('content-type') || ''

    console.log('📋 Content-Type:', contentType)
    console.log('📋 Headers:', JSON.stringify(headers, null, 2))

    // Parse request body based on content type
    let body: any
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle form-urlencoded (ping requests)
      const text = await request.text()
      const params = new URLSearchParams(text)
      body = Object.fromEntries(params.entries())
      console.log('📋 Form Data:', body)
    } else {
      // Handle JSON (actual order webhooks)
      body = await request.json()
      console.log('📋 JSON Body:', JSON.stringify(body, null, 2))
    }

    // Log complete request to test-logger (for debugging when needed)
    requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url,
      headers,
      body,
      query: {}
    })

    // Handle ping event
    const topic = request.headers.get('x-wc-webhook-topic')
    if (topic === 'ping' || body.webhook_id || !body.id) {
      console.log('🏓 Ping event detected:', { topic, webhook_id: body.webhook_id })

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

    console.log('🔍 Processing WooCommerce order:', {
      orderId: body.id,
      status: body.status,
      total: body.total,
      customerEmail: body.billing?.email
    })

    // Get the first active WooCommerce integration
    console.log('🔗 Looking for active WooCommerce integration...')
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, status, is_active, domain, base_url')
      .eq('type', 'woocommerce')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (integrationError) {
      console.error('❌ Integration query error:', integrationError)
      webhookLogger.logWebhookError(requestId, {
        error: `Integration query failed: ${integrationError.message}`,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      })
    }

    if (!integration) {
      console.error('❌ No active WooCommerce integration found')
      webhookLogger.logWebhookError(requestId, {
        error: 'No active WooCommerce integration found',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      })

      return NextResponse.json(
        {
          error: 'Integration not found',
          message: 'No active WooCommerce integration found. Please create a WooCommerce integration in your CRM.'
        },
        { status: 404 }
      )
    }

    console.log('✅ Found active integration:', {
      id: integration.id,
      name: integration.name,
      domain: integration.domain,
      userId: integration.user_id
    })

    webhookLogger.logIntegrationOperation('woocommerce', 'integration_found', {
      integrationId: integration.id,
      integrationName: integration.name,
      userId: integration.user_id
    })

    // Extract customer data
    console.log('👤 Extracting customer data:', {
      name: `${body.billing.first_name} ${body.billing.last_name}`.trim(),
      email: body.billing.email,
      phone: body.billing.phone
    })

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
    console.log('🔍 Checking for existing order:', { externalOrderId, integrationId: integration.id })

    const { data: existingOrder, error: orderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id')
      .eq('integration_id', integration.id)
      .eq('external_order_id', externalOrderId)
      .single()

    if (orderLookupError && orderLookupError.code !== 'PGRST116') {
      console.error('❌ Order lookup error:', orderLookupError)
      webhookLogger.logWebhookError(requestId, {
        error: 'Order lookup failed',
        details: orderLookupError,
        externalOrderId
      })
    }

    let customer
    let isNewOrder = !existingOrder
    console.log('📦 Order status:', { isNewOrder, existingOrderId: existingOrder?.id })

    // Step 2: Handle Customer (only increment total_order for new orders)
    console.log('👤 Looking up existing customer:', { email: customerEmail, userId: integration.user_id })

    const { data: existingCustomer, error: customerLookupError } = await supabaseAdmin
      .from('customers')
      .select('id, total_order')
      .eq('email', customerEmail)
      .eq('user_id', integration.user_id)
      .single()

    if (customerLookupError && customerLookupError.code !== 'PGRST116') {
      console.error('❌ Customer lookup error:', customerLookupError)
      webhookLogger.logWebhookError(requestId, {
        error: 'Customer lookup failed',
        details: customerLookupError,
        customerEmail
      })
    }


    if (existingCustomer) {
      console.log('👤 Updating existing customer:', {
        customerId: existingCustomer.id,
        currentTotalOrders: existingCustomer.total_order,
        willIncrement: isNewOrder
      })

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
        console.error('❌ Failed to update customer:', updateError)
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

      console.log('✅ Customer updated successfully:', {
        customerId: updatedCustomer.id,
        newTotalOrders: updatedCustomer.total_order
      })

      webhookLogger.logDatabaseOperation('update', 'customers', {
        customerId: updatedCustomer.id,
        customerEmail: customerEmail,
        totalOrder: updatedCustomer.total_order,
        isNewOrder
      })

      webhookLogger.logWebhookProcessing(requestId, 'customer_updated', {
        customer_id: updatedCustomer.id,
        customer_email: customerEmail,
        total_order: updatedCustomer.total_order
      })
      customer = updatedCustomer
    } else {
      console.log('👤 Creating new customer:', { email: customerEmail, name: customerName })

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
        console.error('❌ Failed to create customer:', insertError)
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

      console.log('✅ Customer created successfully:', {
        customerId: newCustomer.id,
        email: newCustomer.email
      })

      webhookLogger.logDatabaseOperation('insert', 'customers', {
        customerId: newCustomer.id,
        customerEmail: customerEmail,
        userId: integration.user_id
      })

      webhookLogger.logWebhookProcessing(requestId, 'customer_created', {
        customer_id: newCustomer.id,
        customer_email: customerEmail,
        total_order: newCustomer.total_order
      })
      customer = newCustomer
    }

    // Step 3: Upsert Order
    console.log('📦 Processing order:', {
      externalOrderId,
      status: body.status,
      totalAmount,
      orderCreatedAt,
      isNewOrder
    })

    const orderCreatedAt = new Date(body.date_created).toISOString()
    const totalAmount = parseFloat(body.total)

    let order
    if (existingOrder) {
      console.log('📦 Updating existing order:', {
        orderId: existingOrder.id,
        newStatus: body.status,
        newTotal: totalAmount
      })

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
        console.error('❌ Failed to update order:', updateError)
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

      console.log('✅ Order updated successfully:', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        totalAmount: updatedOrder.total_amount
      })

      webhookLogger.logDatabaseOperation('update', 'orders', {
        orderId: updatedOrder.id,
        externalOrderId,
        status: updatedOrder.status,
        totalAmount: updatedOrder.total_amount
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_updated', {
        order_id: updatedOrder.id,
        external_order_id: externalOrderId,
        status: updatedOrder.status,
        total_amount: updatedOrder.total_amount
      })
      order = updatedOrder
    } else {
      console.log('📦 Creating new order:', {
        externalOrderId,
        customerId: customer.id,
        status: body.status,
        totalAmount
      })

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
        console.error('❌ Failed to create order:', insertError)
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

      console.log('✅ Order created successfully:', {
        orderId: newOrder.id,
        externalOrderId,
        status: newOrder.status,
        totalAmount: newOrder.total_amount
      })

      webhookLogger.logDatabaseOperation('insert', 'orders', {
        orderId: newOrder.id,
        externalOrderId,
        status: newOrder.status,
        totalAmount: newOrder.total_amount,
        customerId: customer.id
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_created', {
        order_id: newOrder.id,
        external_order_id: externalOrderId,
        status: newOrder.status,
        total_amount: newOrder.total_amount
      })
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
        console.error('❌ Failed to delete existing order items:', deleteError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to delete existing order items',
          details: deleteError,
          order_id: order.id
        })
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
        console.error('❌ Failed to create order items:', itemsInsertError)
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

      console.log('✅ Order items created successfully:', {
        orderId: order.id,
        itemsCount: orderItems.length
      })

      webhookLogger.logDatabaseOperation('insert', 'order_items', {
        orderId: order.id,
        itemsCount: orderItems.length
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_items_saved', {
        order_id: order.id,
        items_count: orderItems.length
      })
    }
    // Send Telegram notification to integration owner (non-blocking)
    console.log('📱 Sending Telegram notification:', {
      orderId: order.id,
      customerEmail: customerEmail,
      totalAmount: body.total,
      isNewOrder
    })

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
      
      webhookLogger.logWebhookProcessing(requestId, 'sending_telegram_notification', {
        user_id: integration.user_id,
        order_id: order.id
      })
      
      sendOrderNotification(integration.user_id, orderData)
        .then((result) => {
          if (result.success) {
            webhookLogger.logWebhookProcessing(requestId, 'telegram_notification_sent', {
              user_id: integration.user_id,
              order_id: order.id,
              message: 'Telegram notification sent successfully'
            })
          } else {
            webhookLogger.logWebhookError(requestId, {
              error: 'Telegram notification failed',
              message: result.error || 'Unknown telegram error',
              user_id: integration.user_id,
              order_id: order.id,
              telegram_error_details: result
            })
          }
        })
        .catch((error) => {
          webhookLogger.logWebhookError(requestId, {
            error: 'Telegram notification exception',
            message: error.message || 'Unknown telegram exception',
            user_id: integration.user_id,
            order_id: order.id,
            telegram_exception_details: error
          })
        })
    } catch (error) {
      webhookLogger.logWebhookError(requestId, {
        error: 'Telegram notification setup failed',
        message: error.message || 'Failed to setup telegram notification',
        user_id: integration.user_id,
        order_id: order.id
      })
    }


    // Verify order was created in CRM
    const { data: verifyOrder, error: verifyError } = await supabaseAdmin
      .from('orders')
      .select('id, external_order_id, status, total_amount, customer_id')
      .eq('id', order.id)
      .single()

    if (verifyError || !verifyOrder) {
      webhookLogger.logWebhookError(requestId, {
        error: 'Order verification failed',
        message: 'Order was not found in CRM after creation',
        order_id: order.id,
        verification_error: verifyError
      })
    } else {
      webhookLogger.logWebhookProcessing(requestId, 'order_verified_in_crm', {
        order_id: verifyOrder.id,
        external_order_id: verifyOrder.external_order_id,
        status: verifyOrder.status,
        total_amount: verifyOrder.total_amount,
        customer_id: verifyOrder.customer_id
      })
    }

    webhookLogger.logWebhookResponse(requestId, {
      status: 200,
      message: 'Order processed successfully',
      data: {
        order_id: order.id,
        customer_id: customer.id,
        external_order_id: externalOrderId,
        is_new_order: isNewOrder,
        crm_verified: !!verifyOrder
      },
      processingTime: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      orderId: order.id,
      customerId: customer.id,
      crmVerified: !!verifyOrder
    })

  } catch (error: any) {
    console.error('❌ Webhook processing error:', {
      message: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    })

    // Log error if requestId exists
    if (requestId) {
      webhookLogger.logWebhookError(requestId, {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      })
    } else {
      // If we don't have a requestId, create a basic log entry
      webhookLogger.logOperation('webhook_error', {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      })
    }

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