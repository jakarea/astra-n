import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

// Shopify order webhook schema
const shopifyOrderSchema = z.object({
  id: z.number(),
  email: z.string().email().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  total_price: z.string(),
  currency: z.string(),
  financial_status: z.string().optional().nullable(),
  fulfillment_status: z.string().optional().nullable(),
  customer: z.object({
    id: z.number(),
    email: z.string().email().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    default_address: z.object({
      first_name: z.string().optional().nullable(),
      last_name: z.string().optional().nullable(),
      address1: z.string().optional().nullable(),
      address2: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      province: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
      zip: z.string().optional().nullable(),
      phone: z.string().optional().nullable()
    }).optional().nullable()
  }).optional().nullable(),
  line_items: z.array(z.object({
    id: z.number(),
    product_id: z.number().optional().nullable(),
    variant_id: z.number().optional().nullable(),
    title: z.string(),
    name: z.string(),
    sku: z.string().optional().nullable(),
    quantity: z.number(),
    price: z.string()
  }))
})

// WooCommerce order webhook schema
const wooCommerceOrderSchema = z.object({
  id: z.number(),
  date_created: z.string(),
  date_modified: z.string(),
  total: z.string(),
  currency: z.string(),
  status: z.string(),
  billing: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional()
  }),
  line_items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    product_id: z.number(),
    sku: z.string().optional(),
    quantity: z.number(),
    price: z.number(),
    total: z.string()
  }))
})

function verifyShopifyHmac(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const generatedHash = hmac.digest('base64')
  return crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(signature))
}

function verifyWooCommerceSignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const generatedHash = hmac.digest('base64')
  return crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const domain = url.searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
    }

    // Get the integration by domain
    const integration = await prisma.integration.findUnique({
      where: { domain },
      include: { user: true }
    })

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (!integration.isActive) {
      return NextResponse.json({ error: 'Integration is not active' }, { status: 403 })
    }

    // Read the raw body for HMAC verification
    const body = await request.text()

    // Verify webhook signature based on integration type
    let isValidSignature = false

    if (integration.type === 'shopify') {
      const shopifySignature = request.headers.get('x-shopify-hmac-sha256')
      if (!shopifySignature) {
        return NextResponse.json({ error: 'Missing Shopify HMAC signature' }, { status: 400 })
      }
      isValidSignature = verifyShopifyHmac(body, shopifySignature, integration.webhookSecret)
    } else if (integration.type === 'woocommerce') {
      const wooSignature = request.headers.get('x-wc-webhook-signature')
      if (!wooSignature) {
        return NextResponse.json({ error: 'Missing WooCommerce webhook signature' }, { status: 400 })
      }
      isValidSignature = verifyWooCommerceSignature(body, wooSignature, integration.webhookSecret)
    }

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    // Parse the order data
    const orderData = JSON.parse(body)
    let normalizedOrder

    // Normalize order data based on platform
    if (integration.type === 'shopify') {
      const validatedData = shopifyOrderSchema.parse(orderData)
      normalizedOrder = {
        externalOrderId: validatedData.id.toString(),
        status: validatedData.financial_status || 'pending',
        totalAmount: parseFloat(validatedData.total_price),
        orderCreatedAt: new Date(validatedData.created_at),
        customer: {
          email: validatedData.customer?.email || validatedData.email || '',
          name: `${validatedData.customer?.first_name || ''} ${validatedData.customer?.last_name || ''}`.trim(),
          phone: validatedData.customer?.phone || '',
          address: validatedData.customer?.default_address ? {
            street: `${validatedData.customer.default_address.address1 || ''} ${validatedData.customer.default_address.address2 || ''}`.trim(),
            city: validatedData.customer.default_address.city || '',
            state: validatedData.customer.default_address.province || '',
            zip: validatedData.customer.default_address.zip || '',
            country: validatedData.customer.default_address.country || ''
          } : null
        },
        items: validatedData.line_items.map(item => ({
          productSku: item.sku || '',
          productName: item.title,
          quantity: item.quantity,
          pricePerUnit: parseFloat(item.price)
        }))
      }
    } else if (integration.type === 'woocommerce') {
      const validatedData = wooCommerceOrderSchema.parse(orderData)
      normalizedOrder = {
        externalOrderId: validatedData.id.toString(),
        status: validatedData.status,
        totalAmount: parseFloat(validatedData.total),
        orderCreatedAt: new Date(validatedData.date_created),
        customer: {
          email: validatedData.billing.email || '',
          name: `${validatedData.billing.first_name || ''} ${validatedData.billing.last_name || ''}`.trim(),
          phone: validatedData.billing.phone || '',
          address: {
            street: `${validatedData.billing.address_1 || ''} ${validatedData.billing.address_2 || ''}`.trim(),
            city: validatedData.billing.city || '',
            state: validatedData.billing.state || '',
            zip: validatedData.billing.postcode || '',
            country: validatedData.billing.country || ''
          }
        },
        items: validatedData.line_items.map(item => ({
          productSku: item.sku || '',
          productName: item.name,
          quantity: item.quantity,
          pricePerUnit: item.price
        }))
      }
    } else {
      return NextResponse.json({ error: 'Unsupported integration type' }, { status: 400 })
    }

    // Process the order (this will be implemented in the next task)
    const result = await processWebhookOrder(integration, normalizedOrder)

    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      orderId: result.orderId,
      customerId: result.customerId,
      crmLeadId: result.crmLeadId
    })

  } catch (error) {
    console.error('Webhook processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid order data format', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processWebhookOrder(integration: any, orderData: any) {
  try {
    // Step 1: Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { email: orderData.customer.email }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: orderData.customer.name || 'Unknown Customer',
          email: orderData.customer.email,
          phone: orderData.customer.phone || null,
          address: orderData.customer.address || null
        }
      })
    } else {
      // Update customer info if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: orderData.customer.name || customer.name,
          phone: orderData.customer.phone || customer.phone,
          address: orderData.customer.address || customer.address
        }
      })
    }

    // Step 2: Check if order already exists (prevent duplicates)
    let existingOrder = await prisma.order.findFirst({
      where: {
        integrationId: integration.id,
        externalOrderId: orderData.externalOrderId
      },
      include: {
        crmLead: true
      }
    })

    if (existingOrder) {
      // Update existing order
      const order = await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          status: orderData.status,
          totalAmount: orderData.totalAmount,
          orderCreatedAt: orderData.orderCreatedAt
        }
      })

      return {
        orderId: order.id,
        customerId: customer.id,
        crmLeadId: existingOrder.crmLead?.id || null
      }
    }

    // Step 3: Create new order
    const order = await prisma.order.create({
      data: {
        integrationId: integration.id,
        customerId: customer.id,
        externalOrderId: orderData.externalOrderId,
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        orderCreatedAt: orderData.orderCreatedAt
      }
    })

    // Step 4: Create order items
    const orderItems = await Promise.all(
      orderData.items.map((item: any) =>
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productSku: item.productSku,
            productName: item.productName,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit
          }
        })
      )
    )

    // Step 5: Create CRM Lead for this order
    const primaryItem = orderData.items[0] // Use first item as primary
    const source = `${integration.type.charAt(0).toUpperCase() + integration.type.slice(1)} (${integration.name})`

    const crmLead = await prisma.crmLead.create({
      data: {
        orderId: order.id,
        userId: integration.userId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        source: source,
        logisticStatus: 'pending',
        codStatus: orderData.status === 'pending' ? 'waiting' : 'confirmed',
        kpiStatus: 'new_lead'
      }
    })

    // Step 6: Create initial CRM lead event
    await prisma.crmLeadEvent.create({
      data: {
        leadId: crmLead.id,
        userId: integration.userId,
        type: 'lead_created',
        details: {
          source: source,
          orderId: order.id,
          externalOrderId: orderData.externalOrderId,
          orderTotal: orderData.totalAmount,
          primaryProduct: primaryItem.productName,
          primarySku: primaryItem.productSku,
          itemCount: orderData.items.length
        }
      }
    })

    // TODO: Send Telegram notification (will be implemented in Phase 3)

    return {
      orderId: order.id,
      customerId: customer.id,
      crmLeadId: crmLead.id
    }

  } catch (error) {
    console.error('Error processing webhook order:', error)
    throw error
  }
}