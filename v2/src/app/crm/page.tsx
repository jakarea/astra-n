'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CopyButton } from '@/components/crm/copy-button'
import { AddLeadModal } from '@/components/crm/add-lead-modal'
import { Plus, Eye, Edit, Mail, Phone, Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react'

// Status badge helper
function getStatusBadge(status: string | null, type: 'cod' | 'logistic' | 'kpi') {
  if (!status) return <Badge variant="outline">-</Badge>

  const variants = {
    cod: {
      pending: { variant: "outline" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      rejected: { variant: "destructive" as const, label: "Rejected" }
    },
    logistic: {
      pending: { variant: "outline" as const, label: "Pending" },
      processing: { variant: "secondary" as const, label: "Processing" },
      shipped: { variant: "outline" as const, label: "Shipped" },
      delivered: { variant: "default" as const, label: "Delivered" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" }
    },
    kpi: {
      won: { variant: "default" as const, label: "Won" },
      lost: { variant: "destructive" as const, label: "Lost" },
      pending: { variant: "outline" as const, label: "Pending" },
      qualified: { variant: "secondary" as const, label: "Qualified" }
    }
  }

  const config = variants[type][status as keyof typeof variants[typeof type]]
  return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge variant="outline" className="capitalize">{status}</Badge>
}


export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)

  const loadLeads = async () => {
    try {
      setLoading(true)
      // Direct Supabase query with all relations
      const { data, error } = await supabaseClient
        .from('crm_leads')
        .select(`
          *,
          order:orders(
            id,
            external_order_id,
            total_amount,
            customer:customers(name, email)
          ),
          user:users(name),
          tags:crm_lead_tags(
            tag:crm_tags(id, name, color)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      setLeads(data || [])
      setHasError(false)
    } catch (error) {
      console.error('Database connection error:', error)
      setHasError(true)
      setErrorMessage('Unable to connect to database. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const handleLeadSuccess = () => {
    loadLeads() // Refresh the leads list
  }

  // Calculate stats
  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.cod_status === 'pending').length,
    confirmed: leads.filter(l => l.cod_status === 'confirmed').length,
    revenue: leads
      .filter(l => l.order)
      .reduce((sum, l) => sum + Number(l.order?.total_amount || 0), 0)
  }

  // Show error state if database connection failed
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your leads and track conversions
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">Database Connection Error</h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>This is likely because the database tables haven't been created yet.</p>
                <p className="mt-2">The CRM module is fully implemented and ready to use once the database is properly configured.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your leads and track conversions
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All system leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}% conversion` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From converted leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                No leads available. Add your first lead!
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Lead
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Logistics</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-sm">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">ID: {lead.id}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {lead.order ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-mono text-sm">{lead.order.external_order_id}</div>
                              <div className="text-xs text-muted-foreground">€{Number(lead.order.total_amount).toFixed(2)}</div>
                            </div>
                            <CopyButton text={lead.order.external_order_id} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{lead.phone}</span>
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {lead.source.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(lead.logistic_status, 'logistic')}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(lead.cod_status, 'cod')}
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(lead.kpi_status, 'kpi')}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags && lead.tags.length > 0 ? (
                            lead.tags.map((tagRelation) => (
                              <Badge
                                key={tagRelation.tag.id}
                                variant="outline"
                                className="text-xs"
                                style={tagRelation.tag.color ? {
                                  backgroundColor: tagRelation.tag.color + '20',
                                  borderColor: tagRelation.tag.color
                                } : undefined}
                              >
                                {tagRelation.tag.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/crm/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/crm/${lead.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleLeadSuccess}
      />
    </div>
  )
}