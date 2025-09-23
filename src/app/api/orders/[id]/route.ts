import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional()
})

// GET /api/orders/[id] - Get specific order details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = parseInt(params.id)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause based on user role
    let whereClause: any = { id: orderId }

    if (currentUser.role !== 'admin') {
      // Regular users can only see orders from their own integrations
      whereClause.integration = {
        userId: session.user.id
      }
    }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        customer: true,
        integration: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        items: {
          orderBy: {
            id: 'asc'
          }
        },
        crmLead: {
          include: {
            events: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            },
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })

  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/orders/[id] - Update order customer information
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderId = parseInt(params.id)
    if (isNaN(orderId)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData = updateOrderSchema.parse(body)

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause based on user role
    let whereClause: any = { id: orderId }

    if (currentUser.role !== 'admin') {
      // Regular users can only update orders from their own integrations
      whereClause.integration = {
        userId: session.user.id
      }
    }

    // Check if order exists and user has permission
    const existingOrder = await prisma.order.findFirst({
      where: whereClause,
      include: {
        customer: true,
        crmLead: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update customer information
    const customerUpdateData: any = {}
    if (updateData.customerName) customerUpdateData.name = updateData.customerName
    if (updateData.customerEmail) customerUpdateData.email = updateData.customerEmail
    if (updateData.customerPhone !== undefined) customerUpdateData.phone = updateData.customerPhone
    if (updateData.customerAddress) customerUpdateData.address = updateData.customerAddress

    let updatedCustomer = existingOrder.customer

    if (Object.keys(customerUpdateData).length > 0) {
      updatedCustomer = await prisma.customer.update({
        where: { id: existingOrder.customerId },
        data: customerUpdateData
      })

      // If there's a CRM lead, update it too
      if (existingOrder.crmLead) {
        const crmUpdateData: any = {}
        if (updateData.customerName) crmUpdateData.name = updateData.customerName
        if (updateData.customerEmail) crmUpdateData.email = updateData.customerEmail
        if (updateData.customerPhone !== undefined) crmUpdateData.phone = updateData.customerPhone

        if (Object.keys(crmUpdateData).length > 0) {
          await prisma.crmLead.update({
            where: { id: existingOrder.crmLead.id },
            data: crmUpdateData
          })

          // Create an event for the update
          await prisma.crmLeadEvent.create({
            data: {
              leadId: existingOrder.crmLead.id,
              userId: session.user.id,
              type: 'customer_info_updated',
              details: {
                updatedFields: Object.keys(crmUpdateData),
                changes: crmUpdateData
              }
            }
          })
        }
      }
    }

    // Get the updated order with all relations
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        integration: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        items: {
          orderBy: {
            id: 'asc'
          }
        },
        crmLead: {
          include: {
            events: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ order: updatedOrder })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid update data', details: error.errors }, { status: 400 })
    }

    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}