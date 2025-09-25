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

    let body: WooCommerceOrderPayload
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
      .eq('type', 'woocommerce')
      .single()

    if (integrationError || !integration) {
      console.error('[WOOCOMMERCE_WEBHOOK] Integration lookup error:', integrationError)
      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid or does not exist'
        },
        { status: 401 }
      )
    }

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
      // Create new customer
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

    // Step 2: Upsert Order
    const externalOrderId = body.id.toString()
    const orderCreatedAt = new Date(body.date_created).toISOString()
    const totalAmount = parseFloat(body.total)

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

    // Step 3: Handle Order Items
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
            total: body.total,
            currency: body.currency,
            status: body.status,
            integration: 'WooCommerce',
            items: body.line_items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.total
            }))
          }

          const telegramResult = await telegramService.sendOrderNotification(userSettings.telegram_chat_id, orderNotification)

          if (!telegramResult.success) {
            console.error('[WOOCOMMERCE_WEBHOOK] Telegram notification failed:', telegramResult.error)
          }
        }
      } catch (telegramError) {
        console.error('[WOOCOMMERCE_WEBHOOK] Telegram notification error:', telegramError)
        // Don't fail the webhook if Telegram notification fails
      }
    }

    return NextResponse.json(
      {
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
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[WOOCOMMERCE_WEBHOOK] Unexpected error:', error)
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