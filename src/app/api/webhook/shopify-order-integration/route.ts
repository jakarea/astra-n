import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TelegramService, OrderNotification } from '@/lib/telegram'

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
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
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
    } catch (error) {
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
    if (!webhookSecret || typeof webhookSecret !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing webhook secret',
          message: 'x-webhook-secret header is required'
        },
        { status: 401 }
      )
    }

    // Find integration by webhook secret
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id')
      .eq('webhook_secret', webhookSecret)
      .eq('type', 'shopify')
      .single()

    if (integrationError || !integration) {
      console.error('[SHOPIFY_WEBHOOK] Integration lookup error:', integrationError)
      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid or does not exist'
        },
        { status: 401 }
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

    // Step 1: Upsert Customer
    let customer
    const { data: existingCustomer, error: customerLookupError } = await supabaseAdmin
      .from('customers')
      .select('id, total_order')
      .eq('email', customerEmail)
      .eq('user_id', integration.user_id)
      .single()

    if (existingCustomer) {
      // Update existing customer and increment totalOrder
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          name: customerName,
          phone: customerPhone || null,
          address: customerAddress,
          total_order: existingCustomer.total_order + 1,
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
      // Create new customer
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

    // Step 2: Upsert Order
    const externalOrderId = body.id.toString()
    const orderCreatedAt = new Date(body.created_at).toISOString()
    const totalAmount = parseFloat(body.total_price)

    let order
    const { data: existingOrder, error: orderLookupError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('integration_id', integration.id)
      .eq('external_order_id', externalOrderId)
      .single()

    if (existingOrder) {
      // Update existing order
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
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

    // Step 3: Handle Order Items
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

    // Step 4: Send Telegram Notification (only for new orders)
    if (!existingOrder) {
      try {
        // Get user's Telegram chat ID from user settings
        const { data: userSettings } = await supabaseAdmin
          .from('user_settings')
          .select('telegram_chat_id')
          .eq('user_id', integration.user_id)
          .single()

        if (userSettings?.telegram_chat_id) {
          const telegramService = new TelegramService()

          const orderNotification: OrderNotification = {
            orderNumber: externalOrderId,
            customerName,
            customerEmail,
            total: body.total_price,
            currency: 'USD', // Shopify typically uses the store's currency
            status: body.financial_status,
            integration: 'Shopify',
            items: body.line_items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))
          }

          const telegramResult = await telegramService.sendOrderNotification(userSettings.telegram_chat_id, orderNotification)

          if (!telegramResult.success) {
            console.error('[SHOPIFY_WEBHOOK] Telegram notification failed:', telegramResult.error)
          }
        }
      } catch (telegramError) {
        console.error('[SHOPIFY_WEBHOOK] Telegram notification error:', telegramError)
        // Don't fail the webhook if Telegram notification fails
      }
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