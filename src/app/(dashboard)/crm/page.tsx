"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRole } from "@/contexts/RoleContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingState, LoadingSpinner } from "@/components/ui/loading"
import { AddLeadModal } from "@/components/crm/add-lead-modal"
import { ViewLeadModal } from "@/components/crm/view-lead-modal"
import { EditLeadModal } from "@/components/crm/edit-lead-modal"
import { handleError } from "@/lib/error-handling"
import { Search, Filter, Download, Plus, Eye, Edit, Phone, Mail, AlertCircle, RefreshCw } from "lucide-react"


const getStatusBadge = (status: string, type: 'cod' | 'logistic') => {
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
    }
  }

  const config = variants[type][status as keyof typeof variants[typeof type]]
  return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge variant="outline">{status}</Badge>
}

interface CrmLead {
  id: number
  name: string
  email: string | null
  phone: string | null
  source: string
  logistic_status: string
  cod_status: string
  kpi_status: string
  notes: string | null
  created_at: string
  updated_at: string
  user?: {
    name: string
    email: string
  }
  order?: {
    id: number
    external_order_id: string
    total_amount: number
  }
  events?: Array<{
    id: number
    type: string
    details: any
    created_at: string
  }>
  tags?: Array<{
    tag: {
      id: number
      name: string
      color: string
    }
  }>
}

export default function CRMPage() {
  const { user, isAdmin } = useRole()
  const [allLeads, setAllLeads] = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)
  // Load all leads from API (only once)
  const loadAllLeads = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: '1',
        limit: '100' // Load more data initially
      })

      const response = await fetch(`/api/crm/leads?${params}`)
      const result = await response.json()

      console.log('API Response:', result)

      if (result.success) {
        console.log('Setting leads data:', result.data)
        setAllLeads(result.data || [])
        setDataLoaded(true)
      } else {
        console.error('API Error:', result.error)
        setError(result.error?.message || 'Error loading leads')
      }
    } catch (err) {
      const appError = handleError(err)
      setError(appError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Client-side filtering and search
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) {
      return allLeads
    }

    const lowercaseSearch = searchTerm.toLowerCase().trim()
    return allLeads.filter(lead => {
      return (
        lead.name.toLowerCase().includes(lowercaseSearch) ||
        (lead.email && lead.email.toLowerCase().includes(lowercaseSearch)) ||
        (lead.phone && lead.phone.includes(lowercaseSearch)) ||
        lead.source.toLowerCase().includes(lowercaseSearch) ||
        lead.cod_status.toLowerCase().includes(lowercaseSearch) ||
        lead.logistic_status.toLowerCase().includes(lowercaseSearch) ||
        lead.kpi_status.toLowerCase().includes(lowercaseSearch) ||
        (lead.notes && lead.notes.toLowerCase().includes(lowercaseSearch)) ||
        lead.tags?.some(tagRelation =>
          tagRelation.tag.name.toLowerCase().includes(lowercaseSearch)
        )
      )
    })
  }, [allLeads, searchTerm])

  // Load leads on component mount
  useEffect(() => {
    if (!dataLoaded) {
      loadAllLeads()
    }
  }, [])

  // Handle successful lead creation
  const handleLeadSuccess = (newLead: CrmLead) => {
    setAllLeads(prev => [newLead, ...prev])
    // Clear search term to ensure new lead is visible
    setSearchTerm('')
  }

  // Handle view lead
  const handleViewLead = (leadId: number) => {
    setSelectedLeadId(leadId)
    setViewModalOpen(true)
  }

  // Handle edit lead
  const handleEditLead = (lead: CrmLead) => {
    setSelectedLead(lead)
    setEditModalOpen(true)
  }

  // Handle successful lead update
  const handleLeadUpdate = (updatedLead: CrmLead) => {
    setAllLeads(prev =>
      prev.map(lead =>
        lead.id === updatedLead.id ? updatedLead : lead
      )
    )
  }

  // Refresh data manually (for explicit refresh)
  const refreshData = useCallback(async () => {
    setDataLoaded(false)
    await loadAllLeads()
  }, [loadAllLeads])

  // Calculate stats from all leads (not filtered)
  const stats = useMemo(() => ({
    total: allLeads.length,
    pending: allLeads.filter(l => l.cod_status === 'pending').length,
    confirmed: allLeads.filter(l => l.cod_status === 'confirmed').length,
    revenue: allLeads
      .filter(l => l.order)
      .reduce((sum, l) => sum + (l.order?.total_amount || 0), 0)
  }), [allLeads])

  // Calculate filtered stats for display
  const filteredStats = useMemo(() => ({
    total: filteredLeads.length,
    showing: searchTerm ? filteredLeads.length : allLeads.length
  }), [filteredLeads.length, searchTerm, allLeads.length])

  if (loading) {
    return <LoadingState message="Loading CRM leads..." />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Loading error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM Dashboard</h1>
            <p className="text-muted-foreground">Manage your leads and track conversions</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">L</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'All system leads' : 'Your leads'}
                {searchTerm && ` (${filteredStats.showing} shown)`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <span className="text-orange-600 text-xs font-bold">P</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">C</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}% conversion rate` : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">€</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From converted leads</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lead Management</CardTitle>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button variant="outline" disabled={loading}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                {searchTerm && (
                  <div className="text-sm text-muted-foreground">
                    {filteredStats.showing} of {stats.total} leads
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  {searchTerm ? `No leads found matching "${searchTerm}". Try different search terms.` : allLeads.length === 0 ? 'No leads available. Add your first lead!' : 'No results found.'}
                </div>
                {!searchTerm && (
                  <Button
                    className="mt-4"
                    onClick={() => setAddModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Lead
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>COD Status</TableHead>
                    <TableHead>Logistics Status</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {lead.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="h-3 w-3 mr-1" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.order ? (
                          <div>
                            <div className="font-mono text-sm">{lead.order.external_order_id}</div>
                            <div className="text-xs text-muted-foreground">€{lead.order.total_amount.toFixed(2)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {lead.source.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.user ? (
                          <div className="text-sm">
                            {lead.user.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.cod_status, 'cod')}</TableCell>
                      <TableCell>{getStatusBadge(lead.logistic_status, 'logistic')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={lead.kpi_status === 'won' ? 'default' : 'outline'}
                          className="capitalize"
                        >
                          {lead.kpi_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags?.map((tagRelation) => (
                            <Badge
                              key={tagRelation.tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{
                                backgroundColor: tagRelation.tag.color + '20',
                                borderColor: tagRelation.tag.color
                              }}
                            >
                              {tagRelation.tag.name}
                            </Badge>
                          )) || (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewLead(lead.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditLead(lead)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Lead Modal */}
        <AddLeadModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSuccess={handleLeadSuccess}
        />

        {/* View Lead Modal */}
        <ViewLeadModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false)
            setSelectedLeadId(null)
          }}
          onEdit={(lead) => {
            setViewModalOpen(false)
            setSelectedLead(lead)
            setEditModalOpen(true)
          }}
          leadId={selectedLeadId}
        />

        {/* Edit Lead Modal */}
        <EditLeadModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedLead(null)
          }}
          onSuccess={handleLeadUpdate}
          lead={selectedLead}
        />
    </div>
  )
}