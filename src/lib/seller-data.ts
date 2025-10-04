import { createClient } from '@supabase/supabase-js'

// Use Supabase directly like other working modules
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface SellerDashboardData {
  summary: {
    totalOrders: number
    totalProducts: number
    totalCrmLeads: number
    totalIntegrations: number
    totalCustomers: number
    totalRevenue: number
    lowStockProducts: number
    activeIntegrations: number
  }
  charts: {
    orderStatusDistribution: Array<{ status: string; count: number }>
    monthlyPerformance: Array<{ month: string; orders: number; revenue: number }>
    leadsStatus: {
      logistic: Record<string, number>
      cod: Record<string, number>
      kpi: Record<string, number>
    }
    integrationStatus: Array<{ status: string; count: number }>
  }
  recentActivity: {
    orders: Array<any>
    products: Array<any>
    leads: Array<any>
  }
  insights: {
    avgOrderValue: number
    inventoryHealth: number
    leadConversionRate: number
    monthlyGrowth: number
  }
  userInfo: {
    name: string
    role: string
  }
}

// Simple in-memory cache for seller dashboard data (5 minutes)
const sellerCache = new Map<string, { data: SellerDashboardData; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSellerDashboardData(userId: string): Promise<SellerDashboardData> {
  // Check cache first
        const cached = sellerCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    // Get user info first
        const { data: userInfo } = await supabase
      .from('users')
      .select('name, role')
      .eq('id', userId)
      .single()

    // Get counts for this seller using Supabase
        const [
      { count: totalCustomers },
      { count: totalProducts },
      { count: totalCrmLeads },
      { count: totalIntegrations },
      { count: activeIntegrations },
      { data: recentOrdersData },
      { data: topProductsData },
      { data: crmLeadsData },
      { data: integrationsData }
    ] = await Promise.all([
      // Count customers for this seller
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', userId),

      // Count products for this seller
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId),

      // Count CRM leads for this seller
      supabase.from('crm_leads').select('*', { count: 'exact', head: true }).eq('user_id', userId),

      // Count integrations for this seller
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('user_id', userId),

      // Count active integrations
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_active', true),

      // Recent orders for this seller (through integrations)
      supabase
        .from('orders')
        .select(`
          id,
          external_order_id,
          total_amount,
          status,
          order_created_at,
          customers!inner(name, email),
          integrations!inner(name, domain, user_id)
        `)
        .eq('integrations.user_id', userId)
        .order('order_created_at', { ascending: false })
        .limit(10),

      // Top products for this seller
      supabase
        .from('products')
        .select('id, name, sku, price, stock')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),

      // CRM leads for status stats
      supabase
        .from('crm_leads')
        .select('logistic_status, cod_status, kpi_status')
        .eq('user_id', userId),

      // Integrations data for this seller
      supabase
        .from('integrations')
        .select('is_active')
        .eq('user_id', userId)
    ])

    // Count orders and calculate revenue for this seller
        const { data: orderData } = await supabase
      .from('orders')
      .select('total_amount, status, integrations!inner(user_id)')
      .eq('integrations.user_id', userId)

    const totalOrders = orderData?.length || 0
    const totalRevenue = orderData?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0

    // Count low stock products (stock < 10)
        const { count: lowStockProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lt('stock', 10)

    // Process order status distribution
        const orderStatusCounts: Record<string, number> = {}
    orderData?.forEach((order: any) => {
      orderStatusCounts[order.status] = (orderStatusCounts[order.status] || 0) + 1
    })
    const orderStatusDistribution = Object.entries(orderStatusCounts).map(([status, count]) => ({
      status, count
    }))

    // Process leads status stats
        const leadsStatus = {
      logistic: {} as Record<string, number>,
      cod: {} as Record<string, number>,
      kpi: {} as Record<string, number>
    }

    crmLeadsData?.forEach((lead: any) => {
      if (lead.logistic_status) {
        leadsStatus.logistic[lead.logistic_status] =
          (leadsStatus.logistic[lead.logistic_status] || 0) + 1
      }
      if (lead.cod_status) {
        leadsStatus.cod[lead.cod_status] =
          (leadsStatus.cod[lead.cod_status] || 0) + 1
      }
      if (lead.kpi_status) {
        leadsStatus.kpi[lead.kpi_status] =
          (leadsStatus.kpi[lead.kpi_status] || 0) + 1
      }
    })

    // Process integration status
        const integrationStatusCounts = {
      active: activeIntegrations || 0,
      inactive: (totalIntegrations || 0) - (activeIntegrations || 0)
    }
    const integrationStatus = Object.entries(integrationStatusCounts).map(([status, count]) => ({
      status, count
    }))

    // Create monthly performance data (simplified)
        const monthlyPerformance = [
      { month: 'Jan', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Feb', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Mar', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Apr', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'May', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Jun', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) }
    ]

    // Calculate insights
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const inventoryHealth = (totalProducts || 0) > 0 ? Math.max(0, 100 - ((lowStockProducts || 0) / (totalProducts || 1)) * 100) : 100
    const leadConversionRate = (totalCrmLeads || 0) > 0 ? (totalOrders / (totalCrmLeads || 1)) * 100 : 0
    const monthlyGrowth = 8.5 // Would need historical data
        const data: SellerDashboardData = {
      summary: {
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalCrmLeads: totalCrmLeads || 0,
        totalIntegrations: totalIntegrations || 0,
        totalCustomers: totalCustomers || 0,
        totalRevenue: totalRevenue || 0,
        lowStockProducts: lowStockProducts || 0,
        activeIntegrations: activeIntegrations || 0
      },
      charts: {
        orderStatusDistribution,
        monthlyPerformance,
        leadsStatus,
        integrationStatus
      },
      recentActivity: {
        orders: recentOrdersData || [],
        products: topProductsData || [],
        leads: crmLeadsData?.slice(0, 5) || []
      },
      insights: {
        avgOrderValue,
        inventoryHealth,
        leadConversionRate,
        monthlyGrowth
      },
      userInfo: {
        name: userInfo?.name || 'Seller',
        role: userInfo?.role || 'seller'
      }
    }

    // Cache the data
    sellerCache.set(userId, { data, timestamp: Date.now() })

    return data
  } catch (error) {    throw new Error('Failed to fetch dashboard data')
  }
}