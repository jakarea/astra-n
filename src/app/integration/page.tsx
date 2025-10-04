'use client'

import { useState, useEffect, useRef } from 'react'
import { getAuthenticatedClient, getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
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
import { Plus, Edit, Trash2, Link, ShoppingCart, DollarSign, Search, ChevronLeft, ChevronRight, Webhook, Copy, Key, Download } from 'lucide-react'
import { AddIntegrationModal } from '@/components/integration/add-integration-modal'
import { EditIntegrationModal } from '@/components/integration/edit-integration-modal'
import { useSessionExpired } from '@/components/ui/session-expired-modal'

// Status badge helper
function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline" className="text-gray-500">-</Badge>

  const variants: { [key: string]: { variant: "default" | "destructive" | "outline" | "secondary", className: string } } = {
    active: {
      variant: "default",
      className: "border-green-300 bg-green-100 text-green-800 hover:bg-green-200"
    },
    inactive: {
      variant: "outline",
      className: "border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100"
    },
    error: {
      variant: "destructive",
      className: "border-red-300 bg-red-100 text-red-800 hover:bg-red-200"
    }
  }

  const config = variants[status]
  return config ? (
    <Badge variant={config.variant} className={config.className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  ) : (
    <Badge variant="outline" className="capitalize border-gray-300 text-gray-600">
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

// Copy to clipboard function with toast
const copyToClipboard = async (text: string, label: string = 'Text') => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  } catch (_err) {
    toast.error(`Failed to copy ${label.toLowerCase()}`)
  }
}

// Generate delivery URL for integration
const getDeliveryUrl = (integration: any) => {
  if (typeof window !== 'undefined' && integration.type) {
    const baseUrl = window.location.origin
    return `${baseUrl}/api/webhooks/${integration.type}-order-integration`
  }
  return ''
}

// Get supported actions for integration type
const getSupportedActions = (type: string) => {
  const SHOP_TYPES = {
    'shopify': ['order:created', 'order:updated', 'order:deleted', 'order:shipped'],
    'woocommerce': ['order:created', 'order:updated', 'order:cancelled', 'order:completed'],
    'wordpress': ['order:created', 'order:updated', 'order:deleted'],
    'custom': ['webhook:received', 'data:sync']
  }
  return SHOP_TYPES[type as keyof typeof SHOP_TYPES] || []
}

export default function IntegrationPage() {
  const [integrations, setIntegrations] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Session expired modal hook
  const { triggerSessionExpired, SessionExpiredComponent } = useSessionExpired()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editIntegrationId, setEditIntegrationId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; integrationId: string; integrationName: string }>({
    isOpen: false,
    integrationId: '',
    integrationName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalStats, setTotalStats] = useState({
    total: 0,
    active: 0,
    totalOrders: 0,
    totalRevenue: 0
  })
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const ITEMS_PER_PAGE = 10

  // Helper function to check if user is admin (client-side only)
  const isUserAdmin = () => {
    return mounted && userRole === 'admin'
  }

  // Set mounted state and user role on client
  useEffect(() => {
    setMounted(true)
    const session = getSession()
    if (session) {
      setUserRole(session.user.role || null)
    }
  }, [])

  const loadIntegrations = async (page = 1, search = '') => {
    try {
      setLoading(true)
      console.log('[INTEGRATION] Starting to load integrations...', { page, search })

      const session = getSession()
      if (!session) {
        console.error('[INTEGRATION] No session found')
        setLoading(false)
        triggerSessionExpired({
          title: "Authentication Required",
          message: "You must be logged in to view integrations. Please log in first.",
          showRetry: true
        })
        return
      }

      const supabase = getAuthenticatedClient()
      console.log('[INTEGRATION] Authenticated client retrieved')

      // Build search query - filter by current user's integrations only
      let query = supabase
        .from('integrations')
        .select(`
          *,
          user:users(name),
          orders:orders(
            id,
            total_amount
          )
        `, { count: 'exact' })

      // Admin sees all integrations, seller sees only their own
      if (session.user.role !== 'admin') {
        query = query.eq('user_id', session.user.id)
      }

      // Add search filters if search query exists and has 3+ characters
      if (search && search.length >= 3) {
        query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%,type.ilike.%${search}%`)
      }

      // Add pagination
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1


      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      console.log('[INTEGRATION] Query result:', { data, error, integrationCount: data?.length, totalCount: count })
      console.log('[INTEGRATION] Raw integration data:', data?.map(d => ({
        id: d.id,
        name: d.name,
        webhook_secret: d.webhook_secret ? 'SET' : 'NOT_SET',
        user_id: d.user_id
      })))

      if (error) {
        console.error('[INTEGRATION] Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      setIntegrations(data || [])
      setTotalCount(count || 0)
      setHasError(false)
      console.log('[INTEGRATION] Integrations loaded successfully:', data?.length || 0)

      // Load stats separately (without pagination or search filters)
      await loadStats()
    } catch (error) {
      console.error('[INTEGRATION] Database connection error:', error)
      setHasError(true)
      if (error.message && error.message.includes('JWT')) {
        setLoading(false)
        triggerSessionExpired({
          title: "Session Expired",
          message: "Your authentication token has expired for security reasons. Please log in again to continue.",
          showRetry: false
        })
        return
      } else {
        setErrorMessage(`Database error: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const session = getSession()
      if (!session) {
        console.error('[INTEGRATION] No session found for stats')
        return
      }

      const supabase = getAuthenticatedClient()

      // Load stats
      let statsQuery = supabase
        .from('integrations')
        .select(`
          status,
          orders:orders(total_amount)
        `)

      // Admin sees all integrations stats, seller sees only their own
      if (session.user.role !== 'admin') {
        statsQuery = statsQuery.eq('user_id', session.user.id)
      }

      const { data: statsData, error: statsError } = await statsQuery

      if (!statsError && statsData) {
        const stats = {
          total: statsData.length,
          active: statsData.filter(i => i.status === 'active').length,
          totalOrders: statsData.reduce((sum, i) => sum + (i.orders?.length || 0), 0),
          totalRevenue: statsData
            .reduce((sum, i) => {
              const integrationRevenue = i.orders?.reduce((orderSum: number, order: any) => {
                return orderSum + Number(order.total_amount || 0)
              }, 0) || 0
              return sum + integrationRevenue
            }, 0)
        }
        setTotalStats(stats)
      }
    } catch (error) {
      console.error('[INTEGRATION] Stats loading error:', error)
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

  // Load integrations when search query or page changes
  useEffect(() => {
    loadIntegrations(currentPage, searchQuery)
  }, [searchQuery, currentPage])

  // Initial load
  useEffect(() => {
    loadIntegrations()
  }, [])

  // Optimistic updates - no server reload needed
  const handleIntegrationAdded = (newIntegration: any) => {
    // Add to current integrations list
    setIntegrations(prev => [newIntegration, ...prev])

    // Update total count
    setTotalCount(prev => prev + 1)

    // Update stats
    setTotalStats(prev => ({
      ...prev,
      total: prev.total + 1,
      active: newIntegration.status === 'active' ? prev.active + 1 : prev.active
    }))
  }

  const handleIntegrationUpdated = (updatedIntegration: any) => {
    // Update the specific integration in the list
    setIntegrations(prev => prev.map(integration =>
      integration.id === updatedIntegration.id ? { ...integration, ...updatedIntegration } : integration
    ))

    // Recalculate stats by re-fetching only stats (lightweight)
    loadStats()
  }

  const handleIntegrationDeleted = (integrationId: string) => {
    // Remove from current integrations list
    setIntegrations(prev => prev.filter(integration => integration.id !== integrationId))

    // Update total count
    setTotalCount(prev => prev - 1)

    // Recalculate stats
    loadStats()
  }

  const handleEditIntegration = (integrationId: string) => {
    setEditIntegrationId(integrationId)
    setEditModalOpen(true)
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditIntegrationId(null)
  }

  const handleGenerateWebhookSecret = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/generate-webhook-secret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate webhook secret')
      }

      const result = await response.json()

      if (result.success) {
        toast.success('Webhook secret generated successfully!')

        // Update the integration in the local state
        setIntegrations(prev => prev.map(integration =>
          integration.id === parseInt(integrationId)
            ? { ...integration, webhook_secret: result.data.webhook_secret }
            : integration
        ))

        // Copy the new secret to clipboard
        await copyToClipboard(result.data.webhook_secret, 'Webhook secret')
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error: any) {
      console.error('Error generating webhook secret:', error)
      toast.error(`Failed to generate webhook secret: ${error.message}`)
    }
  }

  const openDeleteDialog = (integrationId: string, integrationName: string) => {
    setDeleteDialog({ isOpen: true, integrationId, integrationName })
  }

  const handleDeleteIntegration = async () => {
    const { integrationId } = deleteDialog

    try {
      const session = getSession()
      if (!session) {
        console.error('[INTEGRATION] No session found for delete')
        return
      }

      const supabase = getAuthenticatedClient()

      let deleteQuery = supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId)

      // For sellers, also check user_id; admin can delete any integration
      if (session.user.role !== 'admin') {
        deleteQuery = deleteQuery.eq('user_id', session.user.id)
      }

      const { error } = await deleteQuery

      if (error) {
        throw new Error(error.message)
      }

      handleIntegrationDeleted(integrationId)
      // Close dialog
      setDeleteDialog({ isOpen: false, integrationId: '', integrationName: '' })
    } catch (error) {
      console.error('Error deleting integration:', error)
      alert('Failed to delete integration. Please try again.')
      setDeleteDialog({ isOpen: false, integrationId: '', integrationName: '' })
    }
  }

  const handleExportCSV = async () => {
    try {
      const session = getSession()
      if (!session) {
        alert('You must be logged in to export data.')
        return
      }

      const supabase = getAuthenticatedClient()
      const isAdmin = session.user.role === 'admin'

      let exportQuery = supabase
        .from('integrations')
        .select(`
          id,
          name,
          type,
          domain,
          status,
          is_active,
          webhook_secret,
          created_at,
          user:users(name),
          orders:orders(total_amount)
        `)

      if (!isAdmin) {
        exportQuery = exportQuery.eq('user_id', session.user.id)
      }

      const { data, error } = await exportQuery.order('name')

      if (error) {
        throw new Error(error.message)
      }

      // Create CSV content based on role
      let headers: string[]
      let rows: string[]

      if (isAdmin) {
        headers = ['Created', 'Name', 'Type', 'Domain', 'Delivery URL', 'Actions', 'Status', 'Webhook Secret', 'Owner']
        rows = (data || []).map(integration => {
          const deliveryUrl = integration.type ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${integration.type}-order-integration` : '-'
          const actions = getSupportedActions(integration.type || '').join(', ') || '-'
          const status = integration.is_active ? 'Active' : 'Inactive'

          return [
            new Date(integration.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            `"${integration.name || '-'}"`,
            `"${integration.type || '-'}"`,
            `"${integration.domain || '-'}"`,
            `"${deliveryUrl}"`,
            `"${actions}"`,
            `"${status}"`,
            `"${integration.webhook_secret || '-'}"`,
            `"${integration.user?.name || 'Unknown User'}"`
          ].join(',')
        })
      } else {
        headers = ['Created', 'Name', 'Type', 'Domain', 'Delivery URL', 'Actions', 'Status', 'Webhook Secret']
        rows = (data || []).map(integration => {
          const deliveryUrl = integration.type ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/${integration.type}-order-integration` : '-'
          const actions = getSupportedActions(integration.type || '').join(', ') || '-'
          const status = integration.is_active ? 'Active' : 'Inactive'

          return [
            new Date(integration.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            `"${integration.name || '-'}"`,
            `"${integration.type || '-'}"`,
            `"${integration.domain || '-'}"`,
            `"${deliveryUrl}"`,
            `"${actions}"`,
            `"${status}"`,
            `"${integration.webhook_secret || '-'}"`
          ].join(',')
        })
      }

      const csvContent = [headers.join(','), ...rows].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `integrations-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  // Show error state if database connection failed
  if (hasError && !errorMessage.includes('logged in') && !errorMessage.includes('JWT')) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integration Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your webshop integrations and webhooks
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">Connection Error</h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>This is likely a database configuration issue.</p>
                <p className="mt-2">The Integration module is fully implemented and ready to use once the connection is resolved.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Integration Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your webshop integrations and webhooks
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.total} duration={1200} />
            </div>
            <p className="text-xs text-muted-foreground">
              Connected webshops
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.active} duration={1000} />
            </div>
            <p className="text-xs text-muted-foreground">
              Working integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.totalOrders} duration={1100} />
            </div>
            <p className="text-xs text-muted-foreground">
              From all integrations
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
              €<AnimatedCounter value={totalStats.totalRevenue} duration={1300} />
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Integration Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search integrations (min 3 chars)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Delivery URL</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    {isUserAdmin() && <TableHead>Owner</TableHead>}
                    <TableHead>Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      {isUserAdmin() && (
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      )}
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
          ) : integrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No integrations found matching your search.' : 'No integrations available. Add your first integration!'}
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Integration
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
                      <TableHead>Type</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Delivery URL</TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Webhook</TableHead>
                      {isUserAdmin() && <TableHead>Owner</TableHead>}
                      <TableHead>Operations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.map((integration) => {
                      return (
                        <TableRow key={integration.id}>
                          <TableCell className="text-sm">
                            {new Date(integration.created_at).toLocaleDateString('en-US', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </TableCell>

                          <TableCell>
                            <div>
                              <div className="font-medium">{integration.name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">ID: {integration.id}</div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {integration.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <span className="font-mono text-sm">{integration.domain}</span>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded border max-w-48 truncate">
                                {getDeliveryUrl(integration)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(getDeliveryUrl(integration), 'Delivery URL')}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell>
                            {(() => {
                              const actions = getSupportedActions(integration.type)
                              if (actions.length === 0) return '-'

                              const actionType = actions[0].split(':')[0] // e.g., "order", "webhook", "data"
                              const actionNames = actions.map(a => a.split(':')[1]) // e.g., ["created", "updated", ...]

                              let displayText = actionType + '['
                              if (actionNames.length <= 2) {
                                displayText += actionNames.join(',')
                              } else {
                                displayText += actionNames.slice(0, 2).join(',') + '+' + (actionNames.length - 2)
                              }
                              displayText += ']'

                              return (
                                <span
                                  className="font-mono text-xs bg-muted px-2 py-1 rounded border cursor-help"
                                  title={`Supported actions: ${actions.join(', ')}`}
                                >
                                  {displayText}
                                </span>
                              )
                            })()}
                          </TableCell>

                          <TableCell>
                            {getStatusBadge(integration.status)}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded max-w-24 truncate border">
                                {integration.webhook_secret || 'Not set'}
                              </span>
                              {integration.webhook_secret && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(integration.webhook_secret, 'Webhook secret')}
                                  className="h-6 w-6 p-0"
                                  title="Copy webhook secret"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateWebhookSecret(integration.id.toString())}
                                className="h-6 w-6 p-0"
                                title={integration.webhook_secret ? "Regenerate webhook secret" : "Generate webhook secret"}
                              >
                                <Key className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>

                          {isUserAdmin() && (
                            <TableCell>
                              <div className="text-sm">
                                {integration.user?.name || 'Unknown User'}
                              </div>
                            </TableCell>
                          )}

                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditIntegration(integration.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(integration.id, integration.name)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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

      {/* Add Integration Modal */}
      <AddIntegrationModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleIntegrationAdded}
      />

      {/* Edit Integration Modal */}
      <EditIntegrationModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleIntegrationUpdated}
        integrationId={editIntegrationId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, integrationId: '', integrationName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete integration &quot;{deleteDialog.integrationName}&quot;? This action cannot be undone and will also delete all associated orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIntegration}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Expired Modal */}
      <SessionExpiredComponent />
    </div>
  )
}