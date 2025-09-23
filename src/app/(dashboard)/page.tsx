"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/contexts/RoleContext"
import { Users, ShoppingCart, Package, Euro, TrendingUp, UserCheck, Clock, CheckCircle, AlertTriangle, Shield, Store } from "lucide-react"

export default function Dashboard() {
  const { user, isAdmin, isSeller } = useRole()

  // Role-based data - Admin sees all, Seller sees only their data
  const kpiData = {
    leads: isAdmin ? 1247 : 89,
    orders: isAdmin ? 2847 : 156,
    customers: isAdmin ? 1847 : 78,
    revenue: isAdmin ? 68420 : 12540,
    leadsPending: isAdmin ? 89 : 12,
    leadsConfirmed: isAdmin ? 892 : 67,
    leadsRejected: isAdmin ? 156 : 8,
    leadsShipped: isAdmin ? 734 : 42,
    conversionRate: isAdmin ? 72.5 : 68.2,
    avgOrderValue: isAdmin ? 87.45 : 92.30,
    processedLeads: isAdmin ? 1871 : 98,
    responseTime: isAdmin ? 2.4 : 1.8
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dashboard {isAdmin && <Shield className="inline ml-2 h-6 w-6 text-green-600" />}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Panoramica generale del sistema' : 'I tuoi performance e metriche chiave'}
          </p>
        </div>
        {user && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Benvenuto,</p>
            <p className="text-lg font-semibold">{user.name || user.email}</p>
            <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1">
              {isAdmin ? 'Amministratore' : 'Venditore'}
            </Badge>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? 'Lead Totali (Sistema)' : 'I Miei Lead'}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.leads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? '+12% dal mese scorso' : 'Questo mese'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? 'Ordini (Tutti)' : 'I Miei Ordini'}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.orders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? '+18% dal mese scorso' : 'Questo mese'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? 'Clienti (Sistema)' : 'I Miei Clienti'}
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.customers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? '+12% dal mese scorso' : 'Questo mese'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAdmin ? 'Fatturato Totale' : 'Il Mio Fatturato'}
            </CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{kpiData.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Questo mese</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin-only System Overview */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Panoramica Sistema (Solo Admin)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Store className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-700">12</p>
                <p className="text-sm text-green-600">Venditori Attivi</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-700">847</p>
                <p className="text-sm text-blue-600">Prodotti Gestiti</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold text-purple-700">94.2%</p>
                <p className="text-sm text-purple-600">Uptime Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? 'Stato Lead (Sistema)' : 'I Miei Lead - Stato'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">In Attesa</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{kpiData.leadsPending}</span>
                  <Badge variant="warning">Pending</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Confermati</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{kpiData.leadsConfirmed}</span>
                  <Badge variant="success">Confirmed</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Rifiutati</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{kpiData.leadsRejected}</span>
                  <Badge variant="destructive">Rejected</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Spediti</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{kpiData.leadsShipped}</span>
                  <Badge variant="info">Shipped</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {isAdmin ? 'Performance Sistema' : 'Le Mie Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasso di Conversione</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-bold">{kpiData.conversionRate}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valore Medio Ordine</span>
                <span className="text-sm font-bold">€{kpiData.avgOrderValue}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lead Processati</span>
                <span className="text-sm font-bold">{kpiData.processedLeads.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tempo Medio Risposta</span>
                <span className="text-sm font-bold">{kpiData.responseTime}h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}