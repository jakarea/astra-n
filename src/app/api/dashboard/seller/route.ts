import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSellerDashboardCache, setSellerDashboardCache } from '@/lib/cache-manager'

function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user info
        const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const userId = user.id

    // Check cache first
    const cachedData = getSellerDashboardCache(userId)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Verify user exists in database
        const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', userId)
      .single()

    if (dbError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch seller-specific data (only their own data)
        const [
      { data: sellerOrders },
      { data: sellerProducts },
      { data: sellerCrmLeads },
      { data: sellerIntegrations },
      { data: sellerCustomers },
      { data: recentSellerOrders },
      { data: topSellerProducts }
    ] = await Promise.all([
      // Seller's orders through their integrations
      supabase
        .from('orders')
        .select(`
          id,
          external_order_id,
          total_amount,
          status,
          order_created_at,
          integration:integrations!inner(user_id)
        `)
        .eq('integrations.user_id', userId),

      // Seller's products
      supabase
        .from('products')
        .select('*')
        .eq('user_id', userId),

      // Seller's CRM leads
      supabase
        .from('crm_leads')
        .select('*')
        .eq('user_id', userId),

      // Seller's integrations
      supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId),

      // Seller's customers (through their orders)
      supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          total_order,
          created_at,
          orders!inner(integration:integrations!inner(user_id))
        `)
        .eq('orders.integrations.user_id', userId),

      // Recent orders (last 5)
      supabase
        .from('orders')
        .select(`
          id,
          external_order_id,
          total_amount,
          status,
          order_created_at,
          customer:customers(name, email),
          integration:integrations!inner(user_id, name, domain)
        `)
        .eq('integrations.user_id', userId)
        .order('order_created_at', { ascending: false })
        .limit(5),

      // Top products by stock/recent activity
      supabase
        .from('products')
        .select('id, name, sku, price, stock, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5)
    ])

    // Calculate seller metrics
        const totalRevenue = sellerOrders?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0
    const lowStockProducts = sellerProducts?.filter(product => product.stock < 10).length || 0

    // Process order status distribution
        const orderStatusStats = sellerOrders?.reduce((acc: any, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {}) || {}

    // Process CRM leads status
        const leadsStatusStats = {
      logistic: {},
      cod: {},
      kpi: {}
    }

    sellerCrmLeads?.forEach((lead) => {
      if (lead.logistic_status) {
        leadsStatusStats.logistic[lead.logistic_status] = (leadsStatusStats.logistic[lead.logistic_status] || 0) + 1
      }
      if (lead.cod_status) {
        leadsStatusStats.cod[lead.cod_status] = (leadsStatusStats.cod[lead.cod_status] || 0) + 1
      }
      if (lead.kpi_status) {
        leadsStatusStats.kpi[lead.kpi_status] = (leadsStatusStats.kpi[lead.kpi_status] || 0) + 1
      }
    })

    // Integration status
        const integrationStatusStats = sellerIntegrations?.reduce((acc: any, integration) => {
      acc[integration.status] = (acc[integration.status] || 0) + 1
      return acc
    }, {}) || {}

    // Monthly performance (mock data - would need historical data)
        const monthlyPerformance = [
      { month: 'Jan', orders: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 5000) + 1000 },
      { month: 'Feb', orders: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 5000) + 1000 },
      { month: 'Mar', orders: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 5000) + 1000 },
      { month: 'Apr', orders: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 5000) + 1000 },
      { month: 'May', orders: Math.floor(Math.random() * 20) + 5, revenue: Math.floor(Math.random() * 5000) + 1000 },
      { month: 'Jun', orders: sellerOrders?.length || 0, revenue: totalRevenue }
    ]

    const dashboardData = {
      summary: {
        totalOrders: sellerOrders?.length || 0,
        totalProducts: sellerProducts?.length || 0,
        totalCrmLeads: sellerCrmLeads?.length || 0,
        totalIntegrations: sellerIntegrations?.length || 0,
        totalCustomers: sellerCustomers?.length || 0,
        totalRevenue,
        lowStockProducts,
        activeIntegrations: sellerIntegrations?.filter(i => i.is_active).length || 0
      },
      charts: {
        orderStatusDistribution: Object.keys(orderStatusStats).map(status => ({
          status,
          count: orderStatusStats[status]
        })),
        monthlyPerformance,
        leadsStatus: leadsStatusStats,
        integrationStatus: Object.keys(integrationStatusStats).map(status => ({
          status,
          count: integrationStatusStats[status]
        }))
      },
      recentActivity: {
        orders: recentSellerOrders || [],
        products: topSellerProducts || [],
        leads: sellerCrmLeads?.slice(0, 5) || []
      },
      insights: {
        avgOrderValue: sellerOrders?.length > 0 ? totalRevenue / sellerOrders.length : 0,
        inventoryHealth: sellerProducts?.length > 0 ? ((sellerProducts.length - lowStockProducts) / sellerProducts.length * 100) : 100,
        leadConversionRate: sellerCrmLeads?.length > 0 ? (sellerOrders?.length / sellerCrmLeads.length * 100) : 0,
        monthlyGrowth: monthlyPerformance.length > 1 ?
          ((monthlyPerformance[monthlyPerformance.length - 1].revenue - monthlyPerformance[monthlyPerformance.length - 2].revenue) / monthlyPerformance[monthlyPerformance.length - 2].revenue * 100) : 0
      },
      userInfo: {
        name: userData.name,
        role: userData.role
      }
    }

    // Cache the data
    setSellerDashboardCache(userId, dashboardData)

    return NextResponse.json(dashboardData)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: error.message
    }, { status: 500 })
  }
}