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

interface ShopifyOrderPayload {
  id: number
  email: string
  created_at: string
  updated_at: string
  total_price: string
  financial_status: string
  customer: {
    id: number
    email: string
    first_name: string
    last_name: string
    phone: string
    orders_count: number
    total_spent: string
    default_address: {
      id: number
      first_name: string
      last_name: string
      address1: string
      phone: string
      city: string
      province: string
      country: string
      zip: string
    }
  }
  billing_address: {
    first_name: string
    last_name: string
    address1: string
    phone: string
    city: string
    province: string
    country: string
    zip: string
  }
  shipping_address: {
    first_name: string
    last_name: string
    address1: string
    phone: string
    city: string
    province: string
    country: string
    zip: string
  }
  line_items: Array<{
    id: number
    variant_id: number
    title: string
    quantity: number
    sku: string
    variant_title: string
    price: string
  }>
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  console.log('🔔 ====== SHOPIFY WEBHOOK REQUEST ======')
  console.log('🔔 Time:', timestamp)

  try {
    // Capture request details for logging
    const headers = Object.fromEntries(request.headers.entries())
    const url = request.url
    const body = await request.json()

    // Log complete request to test-logger
    const requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url,
      headers,
      body,
      query: {}
    })

    console.log('🔔 Request ID:', requestId)
    console.log('🔔 Topic:', request.headers.get('x-shopify-topic'))
    console.log('🔔 Order ID:', body.id)
    console.log('🔔 Shop Domain:', request.headers.get('x-shopify-shop-domain'))

    // Get shop domain from header
    const shopDomain = request.headers.get('x-shopify-shop-domain')
    if (!shopDomain) {
      webhookLogger.logWebhookError(requestId, {
        message: 'Missing x-shopify-shop-domain header',
        status: 400,
        processingTime: Date.now() - startTime
      })
      return NextResponse.json(
        {
          error: 'Invalid webhook',
          message: 'x-shopify-shop-domain header is required'
        },
        { status: 400 }
      )
    }

    console.log('🔔 Looking for integration with domain:', shopDomain)

    // For Shopify webhooks, just get the first active Shopify integration
    // Since Shopify always sends *.myshopify.com domain
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, status, is_active, domain, base_url')
      .eq('type', 'shopify')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (integrationError || !integration) {
      webhookLogger.logWebhookError(requestId, {
        message: `No active Shopify integration found. Please create a Shopify integration first.`,
        status: 404,
        processingTime: Date.now() - startTime
      })
      return NextResponse.json(
        {
          error: 'Integration not found',
          message: `No active Shopify integration found. Please create a Shopify integration in your CRM.`
        },
        { status: 404 }
      )
    }

    console.log('✅ Found integration:', integration.id, integration.name, 'for shop:', shopDomain)

    webhookLogger.logWebhookProcessing(requestId, {
      integration: {
        id: integration.id,
        name: integration.name,
        domain: integration.domain
      }
    })
    // Validate that we have a valid user_id from webhook secret
    if (!integration.user_id) {      return NextResponse.json(
        {
          error: 'Invalid integration',
          message: 'Integration does not have a valid user_id'
        },
        { status: 400 }
      )
    }
    // Extract customer data
        const customerName = `${body.customer.first_name} ${body.customer.last_name}`.trim()
    const customerEmail = body.customer.email || body.email
    const customerPhone = body.customer.phone || body.billing_address.phone || body.shipping_address.phone
    const customerAddress = {
      billing: {
        first_name: body.billing_address.first_name,
        last_name: body.billing_address.last_name,
        address1: body.billing_address.address1,
        phone: body.billing_address.phone,
        city: body.billing_address.city,
        province: body.billing_address.province,
        country: body.billing_address.country,
        zip: body.billing_address.zip
      },
      shipping: {
        first_name: body.shipping_address.first_name,
        last_name: body.shipping_address.last_name,
        address1: body.shipping_address.address1,
        phone: body.shipping_address.phone,
        city: body.shipping_address.city,
        province: body.shipping_address.province,
        country: body.shipping_address.country,
        zip: body.shipping_address.zip
      },
      customer_default: body.customer.default_address
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

      if (updateError) {        return NextResponse.json(
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
          source: 'shopify',
          total_order: 1
        }])
        .select()
        .single()

      if (insertError) {        return NextResponse.json(
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
        const orderCreatedAt = new Date(body.created_at).toISOString()
    const totalAmount = parseFloat(body.total_price)

    let order
    if (existingOrder) {
      // Update existing order
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          user_id: integration.user_id,
          customer_id: customer.id,
          status: body.financial_status,
          total_amount: totalAmount,
          order_created_at: orderCreatedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrder.id)
        .select()
        .single()

      if (updateError) {        return NextResponse.json(
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
          status: body.financial_status,
          total_amount: totalAmount,
          order_created_at: orderCreatedAt
        }])
        .select()
        .single()

      if (insertError) {        return NextResponse.json(
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

      if (deleteError) {      }
    }

    // Insert new order items
        const orderItems = body.line_items.map(item => ({
      order_id: order.id,
      product_sku: item.sku || '',
      product_name: item.title,
      quantity: item.quantity,
      price_per_unit: parseFloat(item.price)
    }))

    if (orderItems.length > 0) {
      const { error: itemsInsertError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsInsertError) {        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order items'
          },
          { status: 500 }
        )
      }
    }
    // Step 5: Send Telegram Notification (for both create and update)
    try {
      // User identified from webhook secret -> integration lookup
        const notificationUserId = integration.user_id

      // Send Telegram notification (non-blocking)
        const orderData = {
        externalOrderId,
        customer: {
          name: customerName,
          email: customerEmail
        },
        totalAmount: body.total_price,
        status: body.financial_status,
        orderCreatedAt: body.created_at,
        items: body.line_items.map(item => ({
          productName: item.title,
          quantity: item.quantity,
          pricePerUnit: item.price
        })),
        isUpdate: !isNewOrder
      }

      sendOrderNotification(notificationUserId, orderData).then((result) => {
        if (!result.success) {
        }
      }).catch((error) => {
      })
    } catch (telegramError) {
      // Don't fail the webhook if Telegram notification fails
    }

    const response = {
      success: true,
      message: 'Shopify order processed successfully',
      data: {
        orderId: order.id,
        customerId: customer.id,
        externalOrderId,
        status: body.financial_status,
        totalAmount,
        itemsCount: orderItems.length,
        isNewOrder
      }
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ Order processed successfully in ${processingTime}ms`)

    webhookLogger.logWebhookResponse('request-id', {
      status: 200,
      message: 'Order processed successfully',
      data: response.data,
      processingTime
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('❌ Error processing webhook:', error)

    webhookLogger.logWebhookError('request-id', {
      message: error.message || 'Unknown error',
      stack: error.stack,
      status: 500,
      processingTime
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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