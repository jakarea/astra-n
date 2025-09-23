import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const customersQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(), // Search in customer name, email, phone
  sortBy: z.enum(['created_at', 'name', 'email', 'orders_count']).optional().default('created_at'),
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
      sortBy,
      sortOrder
    } = customersQuerySchema.parse(params)

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    let whereClause: any = {}

    // Role-based access control: customers should only be visible if they have orders from user's integrations
    if (currentUser.role !== 'admin') {
      whereClause.orders = {
        some: {
          integration: {
            userId: session.user.id
          }
        }
      }
    }

    // Search functionality
    if (search) {
      const searchConditions = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]

      // Add phone search if search looks like a phone number
      if (/^\+?[\d\s\-\(\)]+$/.test(search)) {
        searchConditions.push({
          phone: {
            contains: search,
            mode: 'insensitive'
          }
        })
      }

      if (whereClause.orders) {
        // Combine with existing role-based filter
        whereClause.AND = [
          { orders: whereClause.orders },
          { OR: searchConditions }
        ]
        delete whereClause.orders
      } else {
        whereClause.OR = searchConditions
      }
    }

    // Build order by clause
    let orderBy: any = {}
    if (sortBy === 'created_at') {
      orderBy.createdAt = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder
    } else if (sortBy === 'orders_count') {
      // For order count sorting, we'll need to handle this differently
      orderBy = {
        orders: {
          _count: sortOrder
        }
      }
    }

    // Get customers with order count and latest order info
    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
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
            where: currentUser.role === 'admin'
              ? {}
              : {
                  integration: {
                    userId: session.user.id
                  }
                },
            orderBy: {
              orderCreatedAt: 'desc'
            },
            take: 1,
            select: {
              id: true,
              externalOrderId: true,
              totalAmount: true,
              orderCreatedAt: true,
              status: true,
              integration: {
                select: {
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: sortBy === 'orders_count' ? undefined : orderBy,
        skip: offset,
        take: limitNum
      }),
      prisma.customer.count({
        where: whereClause
      })
    ])

    // If sorting by orders count, sort manually
    let sortedCustomers = customers
    if (sortBy === 'orders_count') {
      sortedCustomers = customers.sort((a, b) => {
        const countA = a._count.orders
        const countB = b._count.orders
        return sortOrder === 'asc' ? countA - countB : countB - countA
      })
    }

    // Transform the data to include computed fields
    const transformedCustomers = sortedCustomers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      ordersCount: customer._count.orders,
      latestOrder: customer.orders[0] || null
    }))

    const totalPages = Math.ceil(totalCount / limitNum)

    return NextResponse.json({
      customers: transformedCustomers,
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

    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}