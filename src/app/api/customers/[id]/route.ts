import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
  }).optional()
})

// GET /api/customers/[id] - Get customer details with order history
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

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause for orders based on user role
    let ordersWhereClause: any = {}

    if (currentUser.role !== 'admin') {
      // Regular users can only see orders from their own integrations
      ordersWhereClause.integration = {
        userId: session.user.id
      }
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            orders: currentUser.role === 'admin'
              ? true
              : {
                  where: {
                    integration: {
                      userId: session.user.id
                    }
                  }
                }
          }
        },
        orders: {
          where: ordersWhereClause,
          include: {
            integration: {
              select: {
                id: true,
                name: true,
                type: true,
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
              select: {
                id: true,
                productSku: true,
                productName: true,
                quantity: true,
                pricePerUnit: true
              }
            },
            crmLead: {
              select: {
                id: true,
                logisticStatus: true,
                codStatus: true,
                kpiStatus: true
              }
            }
          },
          orderBy: {
            orderCreatedAt: 'desc'
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if user has access to this customer (must have at least one order from user's integrations)
    if (currentUser.role !== 'admin' && customer.orders.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate summary statistics
    const totalOrderValue = customer.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    const averageOrderValue = customer.orders.length > 0 ? totalOrderValue / customer.orders.length : 0

    // Group orders by status
    const ordersByStatus = customer.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get latest and first order dates
    const orderDates = customer.orders.map(order => order.orderCreatedAt).sort((a, b) => a.getTime() - b.getTime())
    const firstOrderDate = orderDates[0]
    const latestOrderDate = orderDates[orderDates.length - 1]

    return NextResponse.json({
      customer: {
        ...customer,
        orders: customer.orders,
        summary: {
          totalOrders: customer._count.orders,
          totalOrderValue,
          averageOrderValue,
          ordersByStatus,
          firstOrderDate,
          latestOrderDate,
          customerLifetimeValue: totalOrderValue
        }
      }
    })

  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/customers/[id] - Update customer information
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

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData = updateCustomerSchema.parse(body)

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if customer exists and user has permission to edit
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: currentUser.role === 'admin'
            ? {}
            : {
                integration: {
                  userId: session.user.id
                }
              }
        }
      }
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if user has access to this customer
    if (currentUser.role !== 'admin' && existingCustomer.orders.length === 0) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
    })

    // Update related CRM leads if customer info changed
    if (updateData.name || updateData.email || updateData.phone) {
      const crmUpdateData: any = {}
      if (updateData.name) crmUpdateData.name = updateData.name
      if (updateData.email) crmUpdateData.email = updateData.email
      if (updateData.phone !== undefined) crmUpdateData.phone = updateData.phone

      // Find all CRM leads for this customer's orders that belong to this user
      const crmLeads = await prisma.crmLead.findMany({
        where: {
          order: {
            customerId: customerId,
            integration: currentUser.role === 'admin'
              ? {}
              : { userId: session.user.id }
          }
        }
      })

      // Update all related CRM leads
      if (crmLeads.length > 0 && Object.keys(crmUpdateData).length > 0) {
        await Promise.all(
          crmLeads.map(async (lead) => {
            await prisma.crmLead.update({
              where: { id: lead.id },
              data: crmUpdateData
            })

            // Create an event for the update
            await prisma.crmLeadEvent.create({
              data: {
                leadId: lead.id,
                userId: session.user.id,
                type: 'customer_info_updated',
                details: {
                  updatedFields: Object.keys(crmUpdateData),
                  changes: crmUpdateData,
                  updatedFrom: 'customer_profile'
                }
              }
            })
          })
        )
      }
    }

    return NextResponse.json({ customer: updatedCustomer })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid update data', details: error.errors }, { status: 400 })
    }

    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}