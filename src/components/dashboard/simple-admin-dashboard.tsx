"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  ShoppingCart,
  Package,
  UserCheck,
  Settings,
  TrendingUp,
  DollarSign,
  Activity,
  RefreshCw,
  AlertCircle,
  BarChart3,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { getAdminDashboardAction } from '@/app/actions/admin-dashboard'

interface SimpleDashboardData {
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
  recentActivity: {
    orders: Array<any>
  }
  insights: {
    avgOrderValue: number
    conversionRate: number
    customerGrowthRate: number
    orderGrowthRate: number
  }
}

export function SimpleAdminDashboard() {
  const [data, setData] = useState<SimpleDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Clear all caches before fetching fresh data
      await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Fetch fresh data from database
        const result = await getAdminDashboardAction()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      // Transform the data to match our simplified interface
        const transformedData: SimpleDashboardData = {
        summary: {
          totalUsers: result.data.summary.totalUsers || 0,
          totalOrders: result.data.summary.totalOrders || 0,
          totalCustomers: result.data.summary.totalCustomers || 0,
          totalProducts: result.data.summary.totalProducts || 0,
          totalCrmLeads: result.data.summary.totalCrmLeads || 0,
          totalIntegrations: result.data.summary.totalIntegrations || 0,
          totalRevenue: result.data.summary.totalRevenue || 0,
          activeIntegrations: result.data.summary.activeIntegrations || 0
        },
        recentActivity: {
          orders: result.data.recentActivity?.orders || []
        },
        insights: {
          avgOrderValue: result.data.insights?.avgOrderValue || 0,
          conversionRate: result.data.insights?.conversionRate || 0,
          customerGrowthRate: result.data.insights?.customerGrowthRate || 0,
          orderGrowthRate: result.data.insights?.orderGrowthRate || 0
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
              <BarChart3 className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">System overview and management</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-2 px-4 py-1.5">
            <div className="heartbeat-line" />
            <span>Live</span>
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{(data.insights.customerGrowthRate || 0).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{(data.insights.orderGrowthRate || 0).toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
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
              {(data.insights.conversionRate || 0).toFixed(1)}% conversion rate
            </p>
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
        <Link href="/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Manage Users</p>
                  <p className="text-xs text-muted-foreground">Add/edit users</p>
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
                  <p className="text-sm font-medium">Add Products</p>
                  <p className="text-xs text-muted-foreground">Manage inventory</p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/integration">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Integrations</p>
                  <p className="text-xs text-muted-foreground">Setup webhooks</p>
                </div>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">View Orders</p>
                  <p className="text-xs text-muted-foreground">Monitor sales</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Orders
            </span>
            <Link href="/orders">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>Latest order activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentActivity.orders.slice(0, 5).map((order, index) => (
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
    </div>
  )
}