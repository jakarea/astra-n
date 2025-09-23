import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/integrations/stats - Get KPI stats for all integrations
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let integrationStats

    if (currentUser.role === 'admin') {
      // Admin can see stats for all integrations
      integrationStats = await prisma.integration.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          domain: true,
          status: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              orders: true
            }
          },
          orders: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              orderCreatedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Regular users only see their own integration stats
      integrationStats = await prisma.integration.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          type: true,
          domain: true,
          status: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              orders: true
            }
          },
          orders: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              orderCreatedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Calculate KPI metrics for each integration
    const kpiStats = integrationStats.map(integration => {
      const totalOrders = integration._count.orders
      const orders = integration.orders

      // Calculate fulfilled orders (you might want to adjust the status mapping)
      const fulfilledOrders = orders.filter(order =>
        order.status === 'fulfilled' || order.status === 'completed' || order.status === 'shipped'
      ).length

      // Calculate total revenue
      const totalRevenue = orders.reduce((sum, order) => {
        return sum + parseFloat(order.totalAmount.toString())
      }, 0)

      return {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        domain: integration.domain,
        status: integration.status,
        isActive: integration.isActive,
        totalOrders,
        fulfilledOrders,
        revenue: totalRevenue,
        createdAt: integration.createdAt
      }
    })

    return NextResponse.json({ stats: kpiStats })
  } catch (error) {
    console.error('Error fetching integration stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}