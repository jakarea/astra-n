'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import Link from 'next/link'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/crm/copy-button'
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

import { Eye, Edit, Trash2, ShoppingCart, Users, DollarSign, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react'

// Lazy load heavy components
const EditOrderModal = lazy(() => import('@/components/orders/edit-order-modal').then(module => ({ default: module.EditOrderModal })))
const DateRangePicker = lazy(() => import('@/components/ui/date-range-picker').then(module => ({ default: module.DateRangePicker })))

// Add DateRange type for lazy loaded component
type DateRange = {
  from?: Date | undefined
  to?: Date | undefined
}

function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">-</Badge>

  const variants = {
    pending: { variant: "outline" as const, label: "Pending" },
    processing: { variant: "secondary" as const, label: "Processing" },
    paid: { variant: "default" as const, label: "Paid" },
    shipped: { variant: "default" as const, label: "Shipped" },
    delivered: { variant: "default" as const, label: "Delivered" },
    completed: { variant: "default" as const, label: "Completed" },
    cancelled: { variant: "destructive" as const, label: "Cancelled" },
    refunded: { variant: "destructive" as const, label: "Refunded" }
  }

  const config = variants[status as keyof typeof variants]
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

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (countRef.current) {
      clearInterval(countRef.current)
    }

    const increment = value / (duration / 16)
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; orderId: string; orderNumber: string }>({
    isOpen: false,
    orderId: '',
    orderNumber: ''
  })
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [totalStats, setTotalStats] = useState({
    totalOrders: 0,
    uniqueCustomers: 0,
    totalRevenue: 0,
    growth: 0
  })

  const ITEMS_PER_PAGE = 10

  const loadOrders = async (page = 1, search = '', sort = sortBy, dateFilter = dateRange) => {
    try {
      setLoading(true)
      console.log('[Orders] Loading orders...', { page, search, sort, dateFilter })

      const session = getSession()
      if (!session) {
        console.error('[Orders] No session found')
        return
      }

      console.log('[Orders] Loading orders for user:', {
        userId: session.user.id,
        email: session.user.email
      })

      const supabase = getAuthenticatedClient()

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, email),
          integration:integrations!inner(name, type, user_id),
          items:order_items(*)
        `, { count: 'exact' })
        .eq('integration.user_id', session.user.id)

      if (search && search.length >= 3) {
        query = query.or(`external_order_id.ilike.%${search}%,status.ilike.%${search}%,customer.name.ilike.%${search}%,customer.email.ilike.%${search}%`)
      }

      if (dateFilter?.from) {
        // Set start date to beginning of day (00:00:00)
        const fromDate = new Date(dateFilter.from)
        fromDate.setHours(0, 0, 0, 0)

        query = query.gte('order_created_at', fromDate.toISOString())

        if (dateFilter?.to) {
          // Set end date to end of day (23:59:59.999)
          const toDate = new Date(dateFilter.to)
          toDate.setHours(23, 59, 59, 999)

          query = query.lte('order_created_at', toDate.toISOString())
        }
      }

      if (sort === 'date') {
        query = query.order('order_created_at', { ascending: false })
      } else if (sort === 'amount') {
        query = query.order('total_amount', { ascending: false })
      } else {
        query = query.order('status', { ascending: true })
      }

      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('[Orders] Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      setOrders(data || [])
      setTotalCount(count || 0)
      setHasError(false)
      console.log('[Orders] Orders loaded successfully:', (data || []).length)

      await loadStats()
    } catch (error: any) {
      console.error('[Orders] Database connection error:', error)
      setHasError(true)
      setErrorMessage(`Database error: ${error.message || error.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const session = getSession()
      if (!session) {
        console.error('[Orders] No session found for stats')
        return
      }

      const supabase = getAuthenticatedClient()

      const { data: statsData, error: statsError } = await supabase
        .from('orders')
        .select(`
          total_amount,
          customer_id,
          order_created_at,
          integration:integrations!inner(user_id)
        `)
        .eq('integration.user_id', session.user.id)

      if (statsError) {
        console.error('[Orders] Stats query error:', statsError)
        return
      }

      if (statsData) {
        const totalRevenue = statsData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
        const uniqueCustomers = new Set(statsData.map(order => order.customer_id)).size

        // Calculate growth (simplified - comparing to last month)
        const currentMonth = new Date().getMonth()
        const currentMonthOrders = statsData.filter(order =>
          new Date(order.order_created_at).getMonth() === currentMonth
        )
        const lastMonthOrders = statsData.filter(order =>
          new Date(order.order_created_at).getMonth() === (currentMonth - 1)
        )

        const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
        const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
        const growth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

        const stats = {
          totalOrders: statsData.length,
          uniqueCustomers,
          totalRevenue,
          growth: Math.round(growth)
        }
        setTotalStats(stats)
      }
    } catch (error) {
      console.error('[Orders] Stats loading error:', error)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchQuery(searchInput)
        setCurrentPage(1)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    loadOrders(currentPage, searchQuery, sortBy, dateRange)
  }, [searchQuery, currentPage, sortBy, dateRange])

  useEffect(() => {
    loadOrders()
  }, [])

  const handleOrderDeleted = (orderId: string) => {
    setOrders(prev => prev.filter(order => order.id !== parseInt(orderId)))
    setTotalCount(prev => prev - 1)
    loadStats()
  }

  const openDeleteDialog = (orderId: string, orderNumber: string) => {
    setDeleteDialog({ isOpen: true, orderId, orderNumber })
  }

  const openEditModal = (orderId: string) => {
    setEditOrderId(orderId)
    setEditModalOpen(true)
  }

  const handleOrderUpdated = (updatedOrder: any) => {
    setOrders(prev => prev.map(order =>
      order.id === updatedOrder.id ? updatedOrder : order
    ))
    setEditModalOpen(false)
    setEditOrderId(null)
    loadStats()
  }

  const handleDeleteOrder = async () => {
    const { orderId } = deleteDialog

    try {
      const session = getSession()
      if (!session) {
        console.error('[Orders] No session found for delete')
        return
      }

      const supabase = getAuthenticatedClient()

      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) {
        throw new Error(itemsError.message)
      }

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) {
        throw new Error(error.message)
      }

      handleOrderDeleted(orderId)
      setDeleteDialog({ isOpen: false, orderId: '', orderNumber: '' })
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Failed to delete order. Please try again.')
      setDeleteDialog({ isOpen: false, orderId: '', orderNumber: '' })
    }
  }

  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange)
    setCurrentPage(1)
  }

  const clearDateRange = () => {
    setDateRange(undefined)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            <p className="text-muted-foreground">
              Manage customer orders and transactions
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
                <p className="mt-2">The Orders module is fully implemented and ready to use once the database is properly configured.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">
            Manage customer orders and transactions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.totalOrders} duration={1200} />
            </div>
            <p className="text-xs text-muted-foreground">
              All time orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.uniqueCustomers} duration={1000} />
            </div>
            <p className="text-xs text-muted-foreground">
              Unique customers
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
              €<AnimatedCounter value={Math.round(totalStats.totalRevenue)} duration={1300} />
            </div>
            <p className="text-xs text-muted-foreground">
              Total revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalStats.growth > 0 ? '+' : ''}<AnimatedCounter value={totalStats.growth} duration={1100} />%
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle>Order Management</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders (min 3 chars)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Suspense fallback={<Skeleton className="h-9 w-48" />}>
                  <DateRangePicker
                    date={dateRange}
                    onDateChange={handleDateRangeChange}
                    placeholder="Select date range"
                  />
                </Suspense>
                {dateRange && (
                  <Button variant="outline" size="sm" onClick={clearDateRange}>
                    Clear
                  </Button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Integration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No orders found matching your search.' : 'No orders available yet.'}
              </div>
              <p className="text-sm text-muted-foreground">
                Orders will appear here when customers place orders through your integrations.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Integration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {new Date(order.order_created_at || order.created_at).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{order.external_order_id}</span>
                            <CopyButton text={order.external_order_id} />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{order.customer?.email || 'No email'}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{order.items?.length || 0} item(s)</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">€{Number(order.total_amount || 0).toFixed(2)}</div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.integration?.type || 'Unknown'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/orders/${order.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(order.id.toString())}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(order.id.toString(), order.external_order_id)}
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

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, orderId: '', orderNumber: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order "{deleteDialog.orderNumber}"? This action cannot be undone and will also delete all associated order items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      {editModalOpen && (
        <Suspense fallback={null}>
          <EditOrderModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSuccess={handleOrderUpdated}
            orderId={editOrderId}
          />
        </Suspense>
      )}
    </div>
  )
}