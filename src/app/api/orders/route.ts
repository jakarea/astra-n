import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ordersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(), // Search in customer name, email, external order ID
  status: z.string().optional(), // Filter by order status
  integrationId: z.string().optional(), // Filter by specific store/integration
  assignedUserId: z.string().optional(), // Filter by assigned user (admin only)
  dateFrom: z.string().optional(), // Date range filter start
  dateTo: z.string().optional(), // Date range filter end
  sortBy: z.enum(['created_at', 'order_created_at', 'total_amount', 'status']).optional().default('order_created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check role and permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const {
      page,
      limit,
      search,
      status,
      integrationId,
      assignedUserId,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder
    } = ordersQuerySchema.parse(params)

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    // Build where clause based on user role and filters
    let whereClause: any = {}

    // Role-based access control
    if (currentUser.role === 'admin') {
      // Admin can see all orders, but can filter by assigned user
      if (assignedUserId) {
        whereClause.integration = {
          userId: assignedUserId
        }
      }
    } else {
      // Regular users only see orders from their own integrations
      whereClause.integration = {
        userId: session.user.id
      }
    }

    // Apply filters
    if (status) {
      whereClause.status = status
    }

    if (integrationId) {
      const integrationIdNum = parseInt(integrationId)
      if (!isNaN(integrationIdNum)) {
        whereClause.integrationId = integrationIdNum
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.orderCreatedAt = {}
      if (dateFrom) {
        whereClause.orderCreatedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.orderCreatedAt.lte = new Date(dateTo)
      }
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        {
          externalOrderId: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          customer: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    // Build order by clause
    let orderBy: any = {}
    if (sortBy === 'created_at') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'order_created_at') {
      orderBy.orderCreatedAt = sortOrder
    } else if (sortBy === 'total_amount') {
      orderBy.totalAmount = sortOrder
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder
    }

    // Get orders with related data
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          integration: {
            select: {
              id: true,
              name: true,
              type: true,
              domain: true,
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
        orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.order.count({
        where: whereClause
      })
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    return NextResponse.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 })
    }

    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}