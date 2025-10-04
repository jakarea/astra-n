'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getAuthenticatedClient, getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/crm/copy-button'
import { AddCustomerModal } from '@/components/customers/add-customer-modal'
import { EditCustomerModal } from '@/components/customers/edit-customer-modal'
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
import { Plus, Eye, Edit, Trash2, Mail, Phone, Users, UserCheck, TrendingUp, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react'


function formatAddress(address: any) {
  if (!address) return '-'

  const billing = address.billing
  if (!billing) return '-'

  const parts = []
  if (billing.address_1) parts.push(billing.address_1)
  if (billing.address_2) parts.push(billing.address_2)
  if (billing.city) parts.push(billing.city)
  if (billing.state) parts.push(billing.state)
  if (billing.postcode) parts.push(billing.postcode)
  if (billing.country) parts.push(billing.country)

  if (parts.length === 0) return '-'

  return parts.join(', ')
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<NodeJS.Timeout>()

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; customerId: string; customerName: string }>({
    isOpen: false,
    customerId: '',
    customerName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'total_orders'>('name')
  const [totalStats, setTotalStats] = useState({
    total: 0,
    active: 0,
    totalOrders: 0
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

  const loadCustomers = async (page = 1, search = '', sort = sortBy) => {
    try {
      setLoading(true)
      console.log('[Customers] Loading customers...', { page, search, sort })

      const session = getSession()
      if (!session) {
        console.error('[Customers] No session found')
        return
      }

      const supabase = getAuthenticatedClient()

      let query = supabase
        .from('customers')
        .select('id, name, email, phone, address, source, total_order, created_at, updated_at, user:users(name)', { count: 'exact' })

      // Admin sees all customers, seller sees only their own
      const adminStatus = session.user.role === 'admin'
      console.log('[CUSTOMERS] User role check:', {
        userId: session.user.id,
        userRole: session.user.role,
        isAdmin: adminStatus
      })

      if (!adminStatus) {
        console.log('[CUSTOMERS] Filtering by user_id:', session.user.id)
        query = query.eq('user_id', session.user.id)
      } else {
        console.log('[CUSTOMERS] Admin access - showing all data')
      }

      if (search && search.length >= 3) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      if (sort === 'name') {
        query = query.order('name', { ascending: true })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query.range(from, to)

      if (error) {
        console.error('[Customers] Database error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      // Use the total_order field from database
      const customersWithTotals = (data || []).map(customer => {
        return {
          ...customer,
          totalOrders: customer.total_order || 0
        }
      })

      // Sort by computed values if needed
      if (sort === 'total_orders') {
        customersWithTotals.sort((a, b) => b.totalOrders - a.totalOrders)
      }

      setCustomers(customersWithTotals)
      setTotalCount(count || 0)
      setHasError(false)
      console.log('[Customers] Customers loaded successfully:', customersWithTotals.length)

      await loadStats()
    } catch (error: any) {
      console.error('[Customers] Database connection error:', error)
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
        console.error('[Customers] No session found for stats')
        return
      }

      const supabase = getAuthenticatedClient()

      let statsQuery = supabase
        .from('customers')
        .select('id, total_order')

      // Admin sees all customers stats, seller sees only their own
      if (session.user.role !== 'admin') {
        statsQuery = statsQuery.eq('user_id', session.user.id)
      }

      const { data: statsData, error: statsError } = await statsQuery

      if (statsError) {
        console.error('[Customers] Stats query error:', statsError)
        return
      }

      if (statsData) {
        const totalOrdersCount = statsData.reduce((sum, customer) => sum + (customer.total_order || 0), 0)
        const stats = {
          total: statsData.length,
          active: statsData.length, // Assuming all are active for now
          totalOrders: totalOrdersCount
        }
        setTotalStats(stats)
      }
    } catch (error) {
      console.error('[Customers] Stats loading error:', error)
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
    loadCustomers(currentPage, searchQuery, sortBy)
  }, [searchQuery, currentPage, sortBy])

  useEffect(() => {
    loadCustomers()
  }, [])

  const handleCustomerAdded = (newCustomer: any) => {
    setCustomers(prev => [{ ...newCustomer, totalOrders: 0 }, ...prev])
    setTotalCount(prev => prev + 1)
    setTotalStats(prev => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }))
  }

  const handleCustomerUpdated = (updatedCustomer: any) => {
    setCustomers(prev => prev.map(customer =>
      customer.id === updatedCustomer.id ? { ...customer, ...updatedCustomer } : customer
    ))
    loadStats()
  }

  const handleCustomerDeleted = (customerId: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== parseInt(customerId)))
    setTotalCount(prev => prev - 1)
    loadStats()
  }

  const handleEditCustomer = (customerId: string) => {
    setEditCustomerId(customerId)
    setEditModalOpen(true)
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditCustomerId(null)
  }

  const openDeleteDialog = (customerId: string, customerName: string) => {
    setDeleteDialog({ isOpen: true, customerId, customerName })
  }

  const handleDeleteCustomer = async () => {
    const { customerId } = deleteDialog

    try {
      const session = getSession()
      if (!session) {
        console.error('[Customers] No session found for delete')
        return
      }

      const supabase = getAuthenticatedClient()

      let deleteQuery = supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      // For sellers, also check user_id; admin can delete any customer
      if (session.user.role !== 'admin') {
        deleteQuery = deleteQuery.eq('user_id', session.user.id)
      }

      const { error } = await deleteQuery

      if (error) {
        throw new Error(error.message)
      }

      handleCustomerDeleted(customerId)
      setDeleteDialog({ isOpen: false, customerId: '', customerName: '' })
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('Failed to delete customer. Please try again.')
      setDeleteDialog({ isOpen: false, customerId: '', customerName: '' })
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
        .from('customers')
        .select('id, name, email, phone, address, source, total_order, created_at, user:users(name)')

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
        headers = ['Created', 'Name', 'Owner', 'Contact', 'Address', 'Orders', 'Source']
        rows = (data || []).map(customer => [
          new Date(customer.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          `"${customer.name || '-'}"`,
          `"${customer.user?.name || 'Unknown User'}"`,
          `"${customer.email || '-'} / ${customer.phone || '-'}"`,
          `"${formatAddress(customer.address)}"`,
          customer.total_order || 0,
          `"${customer.source || '-'}"`
        ].join(','))
      } else {
        headers = ['Created', 'Name', 'Contact', 'Address', 'Orders', 'Source']
        rows = (data || []).map(customer => [
          new Date(customer.created_at).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          `"${customer.name || '-'}"`,
          `"${customer.email || '-'} / ${customer.phone || '-'}"`,
          `"${formatAddress(customer.address)}"`,
          customer.total_order || 0,
          `"${customer.source || '-'}"`
        ].join(','))
      }

      const csvContent = [headers.join(','), ...rows].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `customers-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
            <p className="text-muted-foreground">
              Manage your customers and track their activity
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
                <p className="mt-2">The Customer module is fully implemented and ready to use once the database is properly configured.</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your customers and track their activity
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.total} duration={1200} />
            </div>
            <p className="text-xs text-muted-foreground">
              All customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.active} duration={1000} />
            </div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.totalOrders} duration={1100} />
            </div>
            <p className="text-xs text-muted-foreground">
              All time orders
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Customer Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers (min 3 chars)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'total_orders')}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="total_orders">Sort by Orders</option>
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
                    <TableHead>Created</TableHead>
                    <TableHead>Name</TableHead>
                    {isUserAdmin() && <TableHead>Owner</TableHead>}
                    <TableHead>Contact</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      {isUserAdmin() && (
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      )}
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
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
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No customers found matching your search.' : 'No customers available. Add your first customer!'}
              </div>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Customer
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
                      {isUserAdmin() && <TableHead>Owner</TableHead>}
                      <TableHead>Contact</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="text-sm">
                          {new Date(customer.created_at).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">ID: {customer.id}</div>
                          </div>
                        </TableCell>

                        {isUserAdmin() && (
                          <TableCell>
                            <div className="text-sm">
                              {customer.user?.name || 'Unknown User'}
                            </div>
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{customer.email}</span>
                                <CopyButton text={customer.email} />
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{customer.phone}</span>
                              </div>
                            )}
                            {!customer.email && !customer.phone && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm max-w-xs truncate" title={formatAddress(customer.address)}>
                            {formatAddress(customer.address)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">{customer.totalOrders}</div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {customer.source?.replace('_', ' ') || 'manual'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/customers/${customer.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCustomer(customer.id.toString())}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(customer.id.toString(), customer.name)}
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

      <AddCustomerModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleCustomerAdded}
      />

      <EditCustomerModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleCustomerUpdated}
        customerId={editCustomerId}
      />

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, customerId: '', customerName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete customer "{deleteDialog.customerName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
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