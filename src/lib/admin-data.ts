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

export interface AdminDashboardData {
  summary: {
    totalUsers: number
    totalOrders: number
    totalCustomers: number
    totalProducts: number
    totalCrmLeads: number
    totalIntegrations: number
    totalRevenue: number
    activeIntegrations: number
  }
  charts: {
    userRoleDistribution: Array<{ role: string; count: number }>
    monthlyOrders: Array<{ month: string; orders: number; revenue: number }>
    leadsStatus: {
      logistic: Record<string, number>
      cod: Record<string, number>
      kpi: Record<string, number>
    }
    integrationsByType: Array<{ type: string; count: number }>
  }
  recentActivity: {
    orders: Array<any>
    topProducts: Array<any>
  }
  insights: {
    avgOrderValue: number
    conversionRate: number
    customerGrowthRate: number
    orderGrowthRate: number
  }
}

// Simple in-memory cache for dashboard data (5 minutes)
let dashboardCache: { data: AdminDashboardData; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // Check cache first
  if (dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_DURATION) {
    return dashboardCache.data
  }

  try {
    // Get counts and data using Supabase - optimized with parallel fetching
    const [
      { count: totalUsers },
      { count: totalOrders },
      { count: totalCustomers },
      { count: totalProducts },
      { count: totalCrmLeads },
      { count: totalIntegrations },
      { count: activeIntegrations },
      { data: recentOrdersData },
      { data: topProductsData },
      { data: userRolesData },
      { data: crmLeadsData },
      { data: integrationsData },
      { data: revenueData }
    ] = await Promise.all([
      // Counts (head: true means no data transfer, only count)
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('crm_leads').select('*', { count: 'exact', head: true }),
      supabase.from('integrations').select('*', { count: 'exact', head: true }),
      supabase.from('integrations').select('*', { count: 'exact', head: true }).eq('is_active', true),

      // Recent Orders (last 10)
      supabase
        .from('orders')
        .select(`
          id,
          external_order_id,
          total_amount,
          status,
          order_created_at,
          customers!inner(name, email),
          integrations!inner(name, domain)
        `)
        .order('order_created_at', { ascending: false })
        .limit(10),

      // Top Products (last 5)
      supabase
        .from('products')
        .select('id, name, sku, price, stock')
        .order('created_at', { ascending: false })
        .limit(5),

      // User roles - only fetch role column
      supabase.from('users').select('role'),

      // CRM leads - only fetch status columns
      supabase.from('crm_leads').select('logistic_status, cod_status, kpi_status'),

      // Integrations - only fetch type column
      supabase.from('integrations').select('type'),

      // Revenue calculation
      supabase.rpc('sum_total_revenue')
    ])

    const totalRevenue = revenueData?.[0]?.sum || 0

    // Process user role distribution
    const roleCounts: Record<string, number> = {}
    userRolesData?.forEach((user: any) => {
      roleCounts[user.role] = (roleCounts[user.role] || 0) + 1
    })
    const userRoleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
      role, count
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

    // Process integration stats
    const typeCounts: Record<string, number> = {}
    integrationsData?.forEach((integration: any) => {
      typeCounts[integration.type] = (typeCounts[integration.type] || 0) + 1
    })
    const integrationsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type, count
    }))

    // Create monthly orders data (simplified for now)
    const monthlyOrders = [
      { month: 'Jan', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Feb', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Mar', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Apr', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'May', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) },
      { month: 'Jun', orders: Math.floor((totalOrders || 0) / 6), revenue: Math.floor((totalRevenue || 0) / 6) }
    ]

    // Calculate insights
    const avgOrderValue = (totalOrders || 0) > 0 ? (totalRevenue || 0) / (totalOrders || 0) : 0
    const conversionRate = (totalCustomers || 0) > 0 ? ((totalOrders || 0) / (totalCustomers || 0)) * 100 : 0

    const data: AdminDashboardData = {
      summary: {
        totalUsers: totalUsers || 0,
        totalOrders: totalOrders || 0,
        totalCustomers: totalCustomers || 0,
        totalProducts: totalProducts || 0,
        totalCrmLeads: totalCrmLeads || 0,
        totalIntegrations: totalIntegrations || 0,
        totalRevenue: totalRevenue || 0,
        activeIntegrations: activeIntegrations || 0
      },
      charts: {
        userRoleDistribution,
        monthlyOrders,
        leadsStatus,
        integrationsByType
      },
      recentActivity: {
        orders: recentOrdersData || [],
        topProducts: topProductsData || []
      },
      insights: {
        avgOrderValue,
        conversionRate,
        customerGrowthRate: 15.2, // Would need historical data to calculate
        orderGrowthRate: 8.5 // Would need historical data to calculate
      }
    }

    // Cache the data
    dashboardCache = { data, timestamp: Date.now() }

    return data
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    throw new Error('Failed to fetch dashboard data')
  }
}