"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ShoppingCart,
  Package,
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  RefreshCw,
  AlertCircle,
  Target,
  ArrowRight,
  Eye,
  Settings,
  AlertTriangle,
  Users
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getSellerDashboardAction } from '@/app/actions/seller-dashboard'

interface SimpleSellerDashboardData {
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
  recentActivity: {
    orders: Array<any>
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

export function SimpleSellerDashboard() {
  const [data, setData] = useState<SimpleSellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Fetch real data from database
        const result = await getSellerDashboardAction(session.user.id)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      // Transform the data to match our simplified interface
        const transformedData: SimpleSellerDashboardData = {
        summary: {
          totalOrders: result.data.summary.totalOrders || 0,
          totalProducts: result.data.summary.totalProducts || 0,
          totalCrmLeads: result.data.summary.totalCrmLeads || 0,
          totalIntegrations: result.data.summary.totalIntegrations || 0,
          totalCustomers: result.data.summary.totalCustomers || 0,
          totalRevenue: result.data.summary.totalRevenue || 0,
          lowStockProducts: result.data.summary.lowStockProducts || 0,
          activeIntegrations: result.data.summary.activeIntegrations || 0
        },
        recentActivity: {
          orders: result.data.recentActivity?.orders || [],
          leads: result.data.recentActivity?.leads || []
        },
        insights: {
          avgOrderValue: result.data.insights?.avgOrderValue || 0,
          inventoryHealth: result.data.insights?.inventoryHealth || 0,
          leadConversionRate: result.data.insights?.leadConversionRate || 0,
          monthlyGrowth: result.data.insights?.monthlyGrowth || 0
        },
        userInfo: {
          name: result.data.userInfo?.name || session.user.name || 'Seller',
          role: result.data.userInfo?.role || 'seller'
        }
      }

      setData(transformedData)
      setError(null)
    } catch (err: any) {      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-8 w-8" />
              Seller Dashboard
            </h1>
            <p className="text-muted-foreground">Your business overview</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load dashboard data'}
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getKpiStatusBadge = (status: string) => {
    const variants = {
      hot: { variant: "destructive" as const, label: "🔥 Hot" },
      warm: { variant: "secondary" as const, label: "🌡️ Warm" },
      cold: { variant: "outline" as const, label: "❄️ Cold" }
    }
    const config = variants[status as keyof typeof variants] || variants.cold
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8" />
            Welcome back, {data.userInfo.name}!
          </h1>
          <p className="text-muted-foreground">Your business overview and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{(data.insights.monthlyGrowth || 0).toFixed(1)}% this month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(data.insights.avgOrderValue || 0)} per order
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Products</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {data && data.summary.lowStockProducts > 0 ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.summary.lowStockProducts} low stock
                </span>
              ) : (
                'All in stock'
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Leads</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCrmLeads}</div>
            <p className="text-xs text-muted-foreground">
              {(data.insights.leadConversionRate || 0).toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Customers</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total customers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Settings className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalIntegrations}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeIntegrations} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">View Orders</p>
                  <p className="text-xs text-muted-foreground">Check recent sales</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">My Products</p>
                  <p className="text-xs text-muted-foreground">View assigned items</p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crm">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Manage Leads</p>
                  <p className="text-xs text-muted-foreground">Follow up prospects</p>
                </div>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">My Customers</p>
                  <p className="text-xs text-muted-foreground">Manage relationships</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders
              </span>
              <Link href="/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Your latest sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.orders.slice(0, 3).map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">#{order.external_order_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer?.name || 'Unknown Customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.recentActivity.orders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Hot Leads
              </span>
              <Link href="/crm">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>Your latest prospects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.leads.slice(0, 3).map((lead, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    <p className="text-xs text-muted-foreground">Source: {lead.source}</p>
                  </div>
                  <div className="text-right">
                    {getKpiStatusBadge(lead.kpi_status)}
                  </div>
                </div>
              ))}
              {data.recentActivity.leads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent leads
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}