"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/contexts/RoleContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  ArrowLeft,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

type IntegrationStats = {
  id: number
  name: string
  type: string
  domain: string
  status: string
  isActive: boolean
  totalOrders: number
  fulfilledOrders: number
  revenue: number
  createdAt: string
}

export default function IntegrationDashboard() {
  const { user, isAdmin } = useRole()
  const [stats, setStats] = useState<IntegrationStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch integration stats')
      }
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Calculate overall metrics
  const totalIntegrations = stats.length
  const activeIntegrations = stats.filter(s => s.isActive).length
  const totalOrders = stats.reduce((sum, s) => sum + s.totalOrders, 0)
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)
  const avgFulfillmentRate = stats.length > 0
    ? stats.reduce((sum, s) => sum + (s.totalOrders > 0 ? (s.fulfilledOrders / s.totalOrders) * 100 : 0), 0) / stats.length
    : 0

  const getPerformanceBadge = (fulfillmentRate: number) => {
    if (fulfillmentRate >= 90) return <Badge className="bg-green-500">Excellent</Badge>
    if (fulfillmentRate >= 70) return <Badge className="bg-yellow-500">Good</Badge>
    if (fulfillmentRate >= 50) return <Badge className="bg-orange-500">Average</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  const getStatusIcon = (isActive: boolean, status: string) => {
    if (!isActive) return <AlertCircle className="h-4 w-4 text-red-500" />
    if (status === 'active') return <CheckCircle className="h-4 w-4 text-green-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/integrations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Integrations
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integration Dashboard</h1>
            <p className="text-muted-foreground">Performance metrics and analytics for all integrations</p>
          </div>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Overall KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIntegrations}</div>
            <p className="text-xs text-muted-foreground">
              {activeIntegrations} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Generated revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Fulfillment Rate</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgFulfillmentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Order completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Integration Stats */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Integration Performance</h2>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading integration stats...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32 text-red-600">
              <AlertCircle className="h-6 w-6 mr-2" />
              {error}
            </CardContent>
          </Card>
        ) : stats.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
              <BarChart3 className="h-6 w-6 mr-2" />
              No integration data available
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.map((integration) => {
              const fulfillmentRate = integration.totalOrders > 0
                ? (integration.fulfilledOrders / integration.totalOrders) * 100
                : 0

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(integration.isActive, integration.status)}
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{integration.domain}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {integration.type}
                        </Badge>
                        {getPerformanceBadge(fulfillmentRate)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Orders Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{integration.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{integration.fulfilledOrders}</div>
                        <p className="text-xs text-muted-foreground">Fulfilled</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">€{integration.revenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>

                    {/* Fulfillment Rate Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Fulfillment Rate</span>
                        <span className="text-sm text-muted-foreground">{fulfillmentRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={fulfillmentRate} className="h-2" />
                    </div>

                    {/* Performance Trend Indicators */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">Performance:</span>
                        {fulfillmentRate >= 80 ? (
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="text-sm">Strong</span>
                          </div>
                        ) : fulfillmentRate >= 60 ? (
                          <div className="flex items-center text-yellow-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span className="text-sm">Moderate</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            <span className="text-sm">Needs Attention</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Since {new Date(integration.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}