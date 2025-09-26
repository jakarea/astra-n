"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from 'recharts'
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Users
} from 'lucide-react'
import { type AdminDashboardData } from '@/lib/admin-data'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface AdminDashboardChartsProps {
  data: AdminDashboardData
}

export function AdminDashboardCharts({ data }: AdminDashboardChartsProps) {
  return (
    <>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Orders
            </CardTitle>
            <CardDescription>Orders and revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyOrderStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              User Roles
            </CardTitle>
            <CardDescription>Distribution of user roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.userRoleStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ role, count, percent }) => `${role}: ${count} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.userRoleStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Integration Statistics
          </CardTitle>
          <CardDescription>Connected platform types and their usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.integrationStats.length > 0 ? (
              data.integrationStats.map((integration) => (
                <div key={integration.type} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium capitalize">{integration.type}</p>
                    <p className="text-xs text-muted-foreground">Platform type</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {integration.count}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="col-span-3">
                <p className="text-sm text-muted-foreground text-center py-4">No integrations found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CRM Leads Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CRM Leads Status
          </CardTitle>
          <CardDescription>Current status distribution of CRM leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logistic Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">Logistic Status</h4>
              <div className="space-y-2">
                {Object.entries(data.leadsStatusStats.logisticStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status || 'Not Set'}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* COD Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">COD Status</h4>
              <div className="space-y-2">
                {Object.entries(data.leadsStatusStats.codStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status || 'Not Set'}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">KPI Status</h4>
              <div className="space-y-2">
                {Object.entries(data.leadsStatusStats.kpiStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{status || 'Not Set'}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}