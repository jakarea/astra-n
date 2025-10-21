import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendOrderNotification } from '@/lib/telegram'
import { webhookLogger } from '@/lib/webhook-logger'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Shopify HMAC verification function
function verifyShopifyHmac(body: string, hmac: string, secret: string): boolean {
  try {
    const digest = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'base64'),
      Buffer.from(hmac, 'base64')
    )
  } catch (error) {
    console.error('❌ HMAC verification error:', error)
    return false
  }
}

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
  let requestId = ''
  
  // Immediate console log for debugging
  console.log('🚨 WEBHOOK RECEIVED - Shopify Order Integration')
  console.log('⏰ Time:', new Date().toLocaleString())
  console.log('🌐 URL:', request.url)
  console.log('🔗 Method:', request.method)

  try {
    // Capture request details for logging
    const headers = Object.fromEntries(request.headers.entries())
    const url = request.url
    
    // Get raw body for HMAC verification
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)
    
    console.log('📋 Headers:', JSON.stringify(headers, null, 2))
    console.log('📋 Body:', JSON.stringify(body, null, 2))

    // Log complete request
    requestId = webhookLogger.logWebhookRequest({
      method: request.method,
      url,
      headers,
      body,
      query: {}
    })

    // Step 1: Verify Shopify HMAC signature
    const shopifyHmac = request.headers.get('x-shopify-hmac-sha256')
    const shopDomain = request.headers.get('x-shopify-shop-domain')
    
    console.log('🔐 Verifying Shopify webhook authentication:', {
      hasHmac: !!shopifyHmac,
      shopDomain: shopDomain
    })

    if (!shopifyHmac || !shopDomain) {
      console.error('❌ Missing Shopify authentication headers')
      webhookLogger.logWebhookError(requestId, {
        error: 'Missing Shopify authentication headers',
        message: 'x-shopify-hmac-sha256 and x-shopify-shop-domain headers are required',
        status: 401,
        processingTime: Date.now() - startTime
      })
      
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Missing Shopify authentication headers'
        },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // Step 2: Find Shopify integration by admin access token (not domain)
    console.log('🔍 Looking for Shopify integration by HMAC verification...')
    
    // First, get all active Shopify integrations to verify HMAC
    const { data: allIntegrations, error: integrationsError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, status, is_active, domain, base_url, admin_access_token')
      .eq('type', 'shopify')
      .eq('is_active', true)

    if (integrationsError || !allIntegrations || allIntegrations.length === 0) {
      console.error('❌ No active Shopify integrations found')
      webhookLogger.logWebhookError(requestId, {
        error: 'No integrations found',
        message: 'No active Shopify integrations found. Please create a Shopify integration first.',
        status: 404,
        processingTime: Date.now() - startTime
      })
      
      return NextResponse.json(
        {
          error: 'Integration not found',
          message: 'No active Shopify integrations found. Please create a Shopify integration first.'
        },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    // Step 3: Find the correct integration by verifying HMAC with each admin access token
    let integration = null
    let validToken = null

    console.log(`🔐 Verifying HMAC against ${allIntegrations.length} Shopify integrations...`)

    for (const int of allIntegrations) {
      if (!int.admin_access_token) {
        console.log(`⚠️ Integration ${int.id} missing admin access token, skipping`)
        continue
      }

      const isValidHmac = verifyShopifyHmac(rawBody, shopifyHmac, int.admin_access_token)
      
      if (isValidHmac) {
        integration = int
        validToken = int.admin_access_token
        console.log(`✅ HMAC verification successful for integration ${int.id}`)
        break
      } else {
        console.log(`❌ HMAC verification failed for integration ${int.id}`)
      }
    }

    if (!integration) {
      console.error('❌ No Shopify integration found with matching admin access token')
      webhookLogger.logWebhookError(requestId, {
        error: 'Invalid HMAC signature',
        message: 'Webhook HMAC signature verification failed against all integrations',
        shopDomain,
        integrationsChecked: allIntegrations.length,
        status: 401,
        processingTime: Date.now() - startTime
      })
      
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid webhook signature - no matching integration found'
        },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
          }
        }
      )
    }

    console.log('✅ Shopify webhook authentication successful:', {
      integrationId: integration.id,
      userId: integration.user_id,
      shopDomain: shopDomain,
      integrationDomain: integration.domain,
      authenticationMethod: 'HMAC verification'
    })

    webhookLogger.logIntegrationOperation('shopify', 'webhook_authenticated', {
      integrationId: integration.id,
      userId: integration.user_id,
      shopDomain: shopDomain,
      integrationDomain: integration.domain,
      authenticationMethod: 'HMAC verification'
    })
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

    let isNewOrder = !existingOrder

    // Step 2: Handle Customer (optimized approach)
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

    let customer
    if (existingCustomer) {
      console.log('👤 Customer exists, incrementing order count:', {
        customerId: existingCustomer.id,
        currentTotalOrders: existingCustomer.total_order,
        willIncrement: isNewOrder
      })

      // Only increment total_order for new orders, no need to update other fields
      const { data: updatedCustomer, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({
          total_order: isNewOrder ? existingCustomer.total_order + 1 : existingCustomer.total_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCustomer.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Failed to update customer order count:', updateError)
        webhookLogger.logWebhookError(requestId, {
          error: 'Failed to update customer order count',
          details: updateError,
          customer_email: customerEmail
        })
        return NextResponse.json(
          {
            error: 'Database error',
            message: 'Failed to update customer order count'
          },
          { status: 500 }
        )
      }

      console.log('✅ Customer order count updated:', {
        customerId: updatedCustomer.id,
        newTotalOrders: updatedCustomer.total_order
      })

      webhookLogger.logDatabaseOperation('update', 'customers', {
        customerId: updatedCustomer.id,
        customerEmail: customerEmail,
        totalOrder: updatedCustomer.total_order,
        isNewOrder,
        operation: 'increment_order_count'
      })

      webhookLogger.logWebhookProcessing(requestId, 'customer_order_count_updated', {
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
          source: 'shopify',
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

    console.log('✅ Customer processed successfully:', { 
      customerId: customer.id, 
      totalOrder: customer.total_order,
      wasExisting: !!existingCustomer
    })

    // Step 3: Process Order
    console.log('📦 Processing order:', {
      externalOrderId,
      status: body.financial_status,
      totalAmount: parseFloat(body.total_price),
      orderCreatedAt: new Date(body.created_at).toISOString(),
      isNewOrder
    })

    const orderCreatedAt = new Date(body.created_at).toISOString()
    const totalAmount = parseFloat(body.total_price)

    let order
    if (existingOrder) {
      console.log('📦 Updating existing order:', {
        orderId: existingOrder.id,
        newStatus: body.financial_status,
        newTotal: totalAmount
      })

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
        externalOrderId: externalOrderId,
        totalAmount: updatedOrder.total_amount,
        status: updatedOrder.status
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_updated', {
        order_id: updatedOrder.id,
        external_order_id: externalOrderId,
        total_amount: updatedOrder.total_amount
      })
      order = updatedOrder
    } else {
      console.log('📦 Creating new order:', {
        externalOrderId,
        customerId: customer.id,
        status: body.financial_status,
        totalAmount: totalAmount
      })

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
        externalOrderId: newOrder.external_order_id,
        status: newOrder.status,
        totalAmount: newOrder.total_amount
      })

      webhookLogger.logDatabaseOperation('insert', 'orders', {
        orderId: newOrder.id,
        externalOrderId: externalOrderId,
        totalAmount: newOrder.total_amount,
        customerId: customer.id
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_created', {
        order_id: newOrder.id,
        external_order_id: externalOrderId,
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

      console.log('✅ Order items created successfully:', { orderId: order.id, itemsCount: orderItems.length })

      webhookLogger.logDatabaseOperation('insert', 'order_items', {
        orderId: order.id,
        itemsCount: orderItems.length
      })

      webhookLogger.logWebhookProcessing(requestId, 'order_items_saved', {
        order_id: order.id,
        items_count: orderItems.length
      })

    })

    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime

    webhookLogger.logWebhookError(requestId, {
      message: error.message || 'Unknown error',
      stack: error.stack,
      status: 500,
      processingTime
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        }
      }
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