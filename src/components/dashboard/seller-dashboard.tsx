"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
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
  ShoppingCart,
  Package,
  UserCheck,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Settings,
  RefreshCw,
  Eye,
  AlertTriangle,
  Target,
  Clock,
  Users
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { toast } from 'sonner'
import { getSellerDashboardAction } from '@/app/actions/seller-dashboard'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#FF6B6B', '#4ECDC4']

interface SellerDashboardData {
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

export function SellerDashboard() {
  const [data, setData] = useState<SellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = async () => {
    try {
      const session = getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const result = await getSellerDashboardAction(session.user.id)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }

      setData(result.data)
    } catch (error: any) {
      console.error('Error fetching seller dashboard:', error)
      toast.error('Failed to load dashboard data', {
        description: error.message
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

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (growth < 0) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Activity className="h-3 w-3 text-gray-500" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-600" />
            My Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, <span className="font-medium">{data.userInfo?.name || 'User'}</span> • {data.userInfo?.role || 'seller'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getGrowthIcon(data.insights?.monthlyGrowth || 0)}
              {formatPercentage(Math.abs(data.insights?.monthlyGrowth || 0))} vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(data.insights?.avgOrderValue || 0)} per order
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CRM Leads</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalCrmLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.insights?.leadConversionRate || 0)} conversion rate
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
            <div className="text-2xl font-bold">{data.summary?.totalProducts || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              {(data.summary?.lowStockProducts || 0) > 0 && (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600">{data.summary?.lowStockProducts || 0} low stock</span>
                </>
              )}
              {(data.summary?.lowStockProducts || 0) === 0 && (
                <span className="text-green-600">All well stocked</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Settings className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalIntegrations || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary?.activeIntegrations || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Health</CardTitle>
            <Activity className={`h-4 w-4 ${getHealthColor(data.insights?.inventoryHealth || 0).replace('text-', 'text-')}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.insights?.inventoryHealth || 0)}`}>
              {formatPercentage(data.insights?.inventoryHealth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Stock status</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Your orders and revenue trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.charts?.monthlyPerformance || []}>
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
                  fillOpacity={0.6}
                  name="Orders"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Order Status
            </CardTitle>
            <CardDescription>Distribution of your orders by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.charts?.orderStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) =>
                    count > 0 ? `${status}: ${count} (${(percent * 100).toFixed(0)}%)` : ''
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(data.charts?.orderStatusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Your latest customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.recentActivity?.orders || []).slice(0, 5).map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">#{order.external_order_id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customer?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.order_created_at).toLocaleDateString()}
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

        {/* Products Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Overview
            </CardTitle>
            <CardDescription>Your recent products and inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.recentActivity?.products || []).slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.price)}</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {product.stock} in stock
                      </span>
                      {product.stock < 10 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </div>
                  </div>
                </div>
              ))}
              {(data.recentActivity?.products || []).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{formatPercentage(data.insights.leadConversionRate)}</div>
            <Progress value={Math.min(data.insights.leadConversionRate, 100)} className="mb-2" />
            <p className="text-xs text-muted-foreground">Leads converted to orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Inventory Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-2 ${getHealthColor(data.insights.inventoryHealth)}`}>
              {formatPercentage(data.insights?.inventoryHealth || 0)}
            </div>
            <Progress value={data.insights.inventoryHealth} className="mb-2" />
            <p className="text-xs text-muted-foreground">Well-stocked products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold mb-2 ${data.insights.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.insights.monthlyGrowth >= 0 ? '+' : ''}{formatPercentage(data.insights.monthlyGrowth)}
            </div>
            <Progress value={Math.abs(data.insights.monthlyGrowth)} className="mb-2" />
            <p className="text-xs text-muted-foreground">Revenue vs last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}