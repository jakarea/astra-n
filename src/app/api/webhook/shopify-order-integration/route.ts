import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderNotification } from '@/lib/telegram'

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
  try {
    console.log('[SHOPIFY_WEBHOOK] Received webhook request')
    console.log('[SHOPIFY_WEBHOOK] Headers:', Object.fromEntries(request.headers.entries()))

    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[SHOPIFY_WEBHOOK] Invalid content type:', contentType)
      return NextResponse.json(
        {
          error: 'Invalid content type',
          message: 'Content-Type must be application/json'
        },
        { status: 400 }
      )
    }

    let body: ShopifyOrderPayload
    try {
      body = await request.json()
    } catch (_error) {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      )
    }

    // Validate webhook secret from header
    const webhookSecret = request.headers.get('x-webhook-secret')
    console.log('[SHOPIFY_WEBHOOK] Webhook secret received:', webhookSecret ? 'present' : 'missing')

    if (!webhookSecret || typeof webhookSecret !== 'string') {
      console.log('[SHOPIFY_WEBHOOK] Missing webhook secret header')
      return NextResponse.json(
        {
          error: 'Missing webhook secret',
          message: 'x-webhook-secret header is required'
        },
        { status: 401 }
      )
    }

    // Find integration by webhook secret
    console.log('[SHOPIFY_WEBHOOK] Looking up integration with webhook secret')
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, status, is_active')
      .eq('webhook_secret', webhookSecret)
      .eq('type', 'shopify')
      .single()

    if (integrationError || !integration) {
      console.error('[SHOPIFY_WEBHOOK] Integration lookup error:', integrationError)
      console.log('[SHOPIFY_WEBHOOK] No integration found with provided webhook secret')
      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid or does not exist'
        },
        { status: 401 }
      )
    }

    console.log('[SHOPIFY_WEBHOOK] Integration found:', {
      id: integration.id,
      userId: integration.user_id,
      name: integration.name,
      status: integration.status,
      isActive: integration.is_active
    })

    // Validate that we have a valid user_id from webhook secret
    if (!integration.user_id) {
      console.error('[SHOPIFY_WEBHOOK] No user_id found for integration')
      return NextResponse.json(
        {
          error: 'Invalid integration',
          message: 'Integration does not have a valid user_id'
        },
        { status: 400 }
      )
    }

    console.log('[SHOPIFY_WEBHOOK] User identified from webhook secret:', integration.user_id)

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

      if (updateError) {
        console.error('[SHOPIFY_WEBHOOK] Customer update error:', updateError)
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
          source: 'shopify',
          total_order: 1
        }])
        .select()
        .single()

      if (insertError) {
        console.error('[SHOPIFY_WEBHOOK] Customer insert error:', insertError)
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

      if (updateError) {
        console.error('[SHOPIFY_WEBHOOK] Order update error:', updateError)
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
          status: body.financial_status,
          total_amount: totalAmount,
          order_created_at: orderCreatedAt
        }])
        .select()
        .single()

      if (insertError) {
        console.error('[SHOPIFY_WEBHOOK] Order insert error:', insertError)
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
        console.error('[SHOPIFY_WEBHOOK] Order items delete error:', deleteError)
      }
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

      if (itemsInsertError) {
        console.error('[SHOPIFY_WEBHOOK] Order items insert error:', itemsInsertError)
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to create order items'
          },
          { status: 500 }
        )
      }
    }

    console.log('[SHOPIFY_WEBHOOK] Order processed successfully:', {
      orderId: order.id,
      customerId: customer.id,
      externalOrderId,
      itemsCount: orderItems.length
    })

    // Step 5: Send Telegram Notification (for both create and update)
    try {
      // User identified from webhook secret -> integration lookup
      const notificationUserId = integration.user_id
      console.log('[SHOPIFY_WEBHOOK] Telegram notification target user (from webhook secret):', notificationUserId)

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

      console.log('[SHOPIFY_WEBHOOK] Order data for notification:', JSON.stringify(orderData, null, 2))

      sendOrderNotification(notificationUserId, orderData).then((result) => {
        console.log('[SHOPIFY_WEBHOOK] Telegram notification result:', result)
        if (!result.success) {
          console.error('[SHOPIFY_WEBHOOK] Telegram notification failed:', result.error)
        }
      }).catch((error) => {
        console.error('[SHOPIFY_WEBHOOK] Telegram notification error:', error)
      })
    } catch (telegramError) {
      console.error('[SHOPIFY_WEBHOOK] Telegram notification error:', telegramError)
      // Don't fail the webhook if Telegram notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Shopify order processed successfully',
        data: {
          orderId: order.id,
          customerId: customer.id,
          externalOrderId,
          status: body.financial_status,
          totalAmount,
          itemsCount: orderItems.length
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[SHOPIFY_WEBHOOK] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook'
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