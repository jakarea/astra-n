'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/crm/copy-button'
import { AddLeadModal } from '@/components/crm/add-lead-modal'
import { EditLeadModal } from '@/components/crm/edit-lead-modal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Eye, Edit, Trash2, Mail, Phone, Users, UserCheck, TrendingUp, DollarSign, Search, ChevronLeft, ChevronRight } from 'lucide-react'

// Status badge helper using default Shadcn Badge variants
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
      new: { variant: "outline" as const, label: "New" },
      contacted: { variant: "secondary" as const, label: "Contacted" },
      qualified: { variant: "secondary" as const, label: "Qualified" },
      proposal: { variant: "outline" as const, label: "Proposal" },
      negotiation: { variant: "secondary" as const, label: "Negotiation" },
      won: { variant: "default" as const, label: "Won" },
      lost: { variant: "destructive" as const, label: "Lost" }
    }
  }

  const config = variants[type][status as keyof typeof variants[typeof type]]
  return config ? (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  ) : (
    <Badge variant="outline" className="capitalize">
      {status}
    </Badge>
  )
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (countRef.current) {
      clearInterval(countRef.current)
    }

    const increment = value / (duration / 16) // 60fps
    let current = 0

    countRef.current = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(countRef.current!)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)

    return () => {
      if (countRef.current) {
        clearInterval(countRef.current)
      }
    }
  }, [value, duration])

  return <span>{count}</span>
}


export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; leadId: string; leadName: string }>({
    isOpen: false,
    leadId: '',
    leadName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalStats, setTotalStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    revenue: 0
  })

  const ITEMS_PER_PAGE = 10

  const loadLeads = async (page = 1, search = '') => {
    try {
      setLoading(true)
      console.log('[CRM] Starting to load leads...', { page, search })

      const session = getSession()
      if (!session) {
        console.error('[CRM] No session found')
        return
      }

      const supabase = getAuthenticatedClient()
      console.log('[CRM] Authenticated client retrieved')

      // Build search query - filter by current user's leads only
      let query = supabase
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
        `, { count: 'exact' })
        .eq('user_id', session.user.id)

      // Add search filters if search query exists and has 3+ characters
      if (search && search.length >= 3) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      // Add pagination
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      console.log('[CRM] Query result:', { data, error, leadCount: data?.length, totalCount: count })

      if (error) {
        console.error('[CRM] Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      setLeads(data || [])
      setTotalCount(count || 0)
      setHasError(false)
      console.log('[CRM] Leads loaded successfully:', data?.length || 0)

      // Load stats separately (without pagination or search filters)
      await loadStats()
    } catch (error) {
      console.error('[CRM] Database connection error:', error)
      setHasError(true)
      setErrorMessage('Unable to connect to database. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const session = getSession()
      if (!session) {
        console.error('[CRM] No session found for stats')
        return
      }

      const supabase = getAuthenticatedClient()

      // Load stats for current user's leads only
      const { data: statsData, error: statsError } = await supabase
        .from('crm_leads')
        .select(`
          cod_status,
          order:orders(total_amount)
        `)
        .eq('user_id', session.user.id)

      if (!statsError && statsData) {
        const stats = {
          total: statsData.length,
          pending: statsData.filter(l => l.cod_status === 'pending').length,
          confirmed: statsData.filter(l => l.cod_status === 'confirmed').length,
          revenue: statsData
            .filter(l => l.order)
            .reduce((sum, l) => sum + Number(l.order?.total_amount || 0), 0)
        }
        setTotalStats(stats)
      }
    } catch (error) {
      console.error('[CRM] Stats loading error:', error)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchQuery(searchInput)
        setCurrentPage(1) // Reset to first page on search
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Load leads when search query or page changes
  useEffect(() => {
    loadLeads(currentPage, searchQuery)
  }, [searchQuery, currentPage])

  // Initial load
  useEffect(() => {
    loadLeads()
  }, [])

  // Optimistic updates - no server reload needed
  const handleLeadAdded = (newLead: any) => {
    // Add to current leads list
    setLeads(prev => [newLead, ...prev])

    // Update total count
    setTotalCount(prev => prev + 1)

    // Update stats
    setTotalStats(prev => ({
      ...prev,
      total: prev.total + 1,
      pending: newLead.cod_status === 'pending' ? prev.pending + 1 : prev.pending,
      confirmed: newLead.cod_status === 'confirmed' ? prev.confirmed + 1 : prev.confirmed
    }))
  }

  const handleLeadUpdated = (updatedLead: any) => {
    // Update the specific lead in the list
    setLeads(prev => prev.map(lead =>
      lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead
    ))

    // Recalculate stats by re-fetching only stats (lightweight)
    loadStats()
  }

  const handleLeadDeleted = (leadId: string) => {
    // Remove from current leads list
    setLeads(prev => prev.filter(lead => lead.id !== leadId))

    // Update total count
    setTotalCount(prev => prev - 1)

    // Recalculate stats
    loadStats()
  }

  const handleEditLead = (leadId: string) => {
    setEditLeadId(leadId)
    setEditModalOpen(true)
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditLeadId(null)
  }

  const openDeleteDialog = (leadId: string, leadName: string) => {
    setDeleteDialog({ isOpen: true, leadId, leadName })
  }

  const handleDeleteLead = async () => {
    const { leadId, leadName } = deleteDialog
    // This function is now called after confirmation dialog

    try {
      const session = getSession()
      if (!session) {
        console.error('[CRM] No session found for delete')
        return
      }

      const supabase = getAuthenticatedClient()

      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', leadId)
        .eq('user_id', session.user.id)

      if (error) {
        throw new Error(error.message)
      }

      handleLeadDeleted(leadId)
      // Close dialog
      setDeleteDialog({ isOpen: false, leadId: '', leadName: '' })
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead. Please try again.')
      setDeleteDialog({ isOpen: false, leadId: '', leadName: '' })
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

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
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.total} duration={1200} />
            </div>
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
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.pending} duration={1000} />
            </div>
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
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.confirmed} duration={1100} />
            </div>
            <p className="text-xs text-muted-foreground">
              {totalStats.total > 0 ? `${Math.round((totalStats.confirmed / totalStats.total) * 100)}% conversion` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €<AnimatedCounter value={totalStats.revenue} duration={1300} />
            </div>
            <p className="text-xs text-muted-foreground">
              From converted leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Lead Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads (min 3 chars)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              {totalCount > 0 && (
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {searchQuery ? `${totalCount} filtered` : `${totalCount} total`}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton
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
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-40" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No leads found matching your search.' : 'No leads available. Add your first lead!'}
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Lead
              </Button>
            </div>
          ) : (
            <>
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/crm/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLead(lead.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(lead.id, lead.name)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalCount} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber
                        if (totalPages <= 5) {
                          pageNumber = i + 1
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i
                        } else {
                          pageNumber = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            disabled={loading}
                            className="w-10"
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleLeadAdded}
      />

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleLeadUpdated}
        leadId={editLeadId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, leadId: '', leadName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete lead "{deleteDialog.leadName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}