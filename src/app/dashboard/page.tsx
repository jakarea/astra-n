import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ShoppingCart, Package, Euro, TrendingUp, UserCheck, Clock, CheckCircle, AlertTriangle, BarChart, Target, Calendar, Zap, Award } from "lucide-react"

export default function Dashboard() {
  // Static data for the dashboard
  const kpiData = {
    leads: 1247,
    orders: 2847,
    customers: 1847,
    revenue: 68420,
    leadsPending: 89,
    leadsConfirmed: 892,
    leadsRejected: 156,
    leadsShipped: 734,
    conversionRate: 72.5,
    avgOrderValue: 87.45,
    processedLeads: 1871,
    responseTime: 2.4,
    monthlyGrowth: 24.8,
    totalProducts: 847,
    activeUsers: 324,
    systemUptime: 99.7
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart className="mr-3 h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome to your e-commerce analytics dashboard
          </p>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{kpiData.leads.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <p className="text-xs text-green-600 font-medium">+12% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{kpiData.orders.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <p className="text-xs text-green-600 font-medium">+18% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{kpiData.customers.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <p className="text-xs text-green-600 font-medium">+15% from last month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <Euro className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">€{kpiData.revenue.toLocaleString()}</div>
            <div className="flex items-center mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <p className="text-xs text-green-600 font-medium">+{kpiData.monthlyGrowth}% this month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{kpiData.conversionRate}%</div>
            <p className="text-xs text-blue-700">Industry avg: 68%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Avg Order Value</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">€{kpiData.avgOrderValue}</div>
            <p className="text-xs text-green-700">+€12.30 from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Active Users</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{kpiData.activeUsers}</div>
            <p className="text-xs text-purple-700">Online right now</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{kpiData.responseTime}h</div>
            <p className="text-xs text-orange-700">Avg lead response</p>
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <Card className="border-t-4 border-t-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center text-indigo-800">
            <BarChart className="mr-2 h-5 w-5" />
            System Overview & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500 rounded-full mb-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-green-800 mb-1">{kpiData.totalProducts}</p>
              <p className="text-sm text-green-700 font-medium">Products Managed</p>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-16 h-1 bg-green-300 rounded-full">
                  <div className="w-12 h-1 bg-green-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-blue-800 mb-1">{kpiData.customers.toLocaleString()}</p>
              <p className="text-sm text-blue-700 font-medium">Total Customers</p>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-16 h-1 bg-blue-300 rounded-full">
                  <div className="w-14 h-1 bg-blue-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-full mb-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-purple-800 mb-1">{kpiData.systemUptime}%</p>
              <p className="text-sm text-purple-700 font-medium">System Uptime</p>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-16 h-1 bg-purple-300 rounded-full">
                  <div className="w-16 h-1 bg-purple-600 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-full mb-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <p className="text-3xl font-bold text-orange-800 mb-1">{kpiData.processedLeads.toLocaleString()}</p>
              <p className="text-sm text-orange-700 font-medium">Leads Processed</p>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-16 h-1 bg-orange-300 rounded-full">
                  <div className="w-11 h-1 bg-orange-600 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Status and Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <UserCheck className="mr-2 h-5 w-5" />
              Lead Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-orange-800">Pending</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-900">{kpiData.leadsPending}</span>
                  <div className="w-20 h-2 bg-orange-200 rounded-full mt-1">
                    <div className="w-2/3 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-green-800">Confirmed</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-900">{kpiData.leadsConfirmed}</span>
                  <div className="w-20 h-2 bg-green-200 rounded-full mt-1">
                    <div className="w-full h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm font-medium text-red-800">Rejected</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-red-900">{kpiData.leadsRejected}</span>
                  <div className="w-20 h-2 bg-red-200 rounded-full mt-1">
                    <div className="w-1/4 h-2 bg-red-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-blue-800">Shipped</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-900">{kpiData.leadsShipped}</span>
                  <div className="w-20 h-2 bg-blue-200 rounded-full mt-1">
                    <div className="w-4/5 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <TrendingUp className="mr-2 h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Conversion Rate</span>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-lg font-bold text-blue-900">{kpiData.conversionRate}%</span>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: `${kpiData.conversionRate}%`}}></div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Average Order Value</span>
                  <span className="text-lg font-bold text-green-900">€{kpiData.avgOrderValue}</span>
                </div>
                <p className="text-xs text-green-700">+€12.30 vs last month</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Processed Leads</span>
                  <span className="text-lg font-bold text-purple-900">{kpiData.processedLeads.toLocaleString()}</span>
                </div>
                <p className="text-xs text-purple-700">This month total</p>
              </div>

              <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-800">Avg Response Time</span>
                  <span className="text-lg font-bold text-orange-900">{kpiData.responseTime}h</span>
                </div>
                <p className="text-xs text-orange-700">Target: &lt; 4h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}