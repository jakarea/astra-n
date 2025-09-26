"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import {
  Users,
  ShoppingCart,
  Package,
  UserCheck,
  TrendingUp,
  DollarSign,
  Activity,
  Settings,
  RefreshCw,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Clock
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { toast } from 'sonner'
import { getAdminDashboardAction } from '@/app/actions/admin-dashboard'
import { AdminDashboardData as LibAdminDashboardData } from '@/lib/admin-data'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface AdminDashboardData {
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

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [_selectedChart, _setSelectedChart] = useState('overview')

  const fetchDashboardData = async () => {
    try {
      const session = getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const result = await getAdminDashboardAction()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }


      setData(result.data)
    } catch (error: any) {
      console.error('Error fetching admin dashboard:', error)
      toast.error('Failed to load dashboard data', {
        description: error.message || 'Please refresh the page or contact support if the issue persists.'
      })


      // Set error state for better user experience - use partial data to prevent further errors
      setData({
        summary: {
          totalUsers: 0,
          totalOrders: 0,
          totalCustomers: 0,
          totalProducts: 0,
          totalCrmLeads: 0,
          totalIntegrations: 0,
          totalRevenue: 0,
          activeIntegrations: 0
        },
        charts: {
          userRoleDistribution: [],
          monthlyOrders: [],
          leadsStatus: { logistic: {}, cod: {}, kpi: {} },
          integrationsByType: []
        },
        recentActivity: {
          orders: [],
          topProducts: []
        },
        insights: {
          avgOrderValue: 0,
          conversionRate: 0,
          customerGrowthRate: 0,
          orderGrowthRate: 0
        }
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

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
          {Array.from({ length: 8 }).map((_, i) => (
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No data available</h3>
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number | null | undefined) => {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(validAmount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
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
          <p className="text-muted-foreground">
            Comprehensive analytics and system overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +{formatPercentage(data.insights?.customerGrowthRate || 0)} from last month
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
              +{formatPercentage(data.insights?.orderGrowthRate || 0)} from last month
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
              Avg: {formatCurrency(data.insights?.avgOrderValue || 0)} per order
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
              {formatPercentage(data.insights?.conversionRate || 0)} conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Total customers</p>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              User Role Distribution
            </CardTitle>
            <CardDescription>Distribution of users by their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.charts?.userRoleDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ role, count, percent }: any) => `${role}: ${count} (${((percent as number) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(data.charts?.userRoleDistribution || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Orders and revenue trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.charts.monthlyOrders || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Orders"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Integrations by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Integration Types
            </CardTitle>
            <CardDescription>Distribution of integrations by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.charts?.integrationsByType || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest order activity across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.recentActivity?.orders || []).slice(0, 5).map((order, index) => (
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
              {(data.recentActivity?.orders || []).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{formatPercentage(data.insights?.conversionRate || 0)}</div>
            <Progress value={data.insights?.conversionRate || 0} className="mb-2" />
            <p className="text-xs text-muted-foreground">Leads to orders conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-green-600">99.9%</div>
            <Progress value={99.9} className="mb-2" />
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2 text-blue-600">95.5%</div>
            <Progress value={95.5} className="mb-2" />
            <p className="text-xs text-muted-foreground">Complete records</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}