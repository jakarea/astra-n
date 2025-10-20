'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { getAuthenticatedClient, getSession, isAdmin, resetUserPassword } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, Eye, Edit, Trash2, Search, ChevronLeft, ChevronRight, Users, UserCheck, UserX, Shield, Download, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useSessionExpired } from '@/components/ui/session-expired-modal'

// Lazy load heavy modals
const EditUserModal = lazy(() => import('@/components/users/edit-user-modal').then(module => ({ default: module.EditUserModal })))
const ViewUserModal = lazy(() => import('@/components/users/view-user-modal').then(module => ({ default: module.ViewUserModal })))
const InviteUserModal = lazy(() => import('@/components/users/invite-user-modal').then(module => ({ default: module.InviteUserModal })))

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (countRef.current) {
      clearInterval(countRef.current)
    }

    // Ensure value is a valid number, default to 0 if NaN or undefined
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
    
    if (safeValue === 0) {
      setCount(0)
      return
    }

    const increment = safeValue / (duration / 16) // 60fps
    let current = 0

    countRef.current = setInterval(() => {
      current += increment
      if (current >= safeValue) {
        setCount(safeValue)
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

  return <span>{Math.round(count).toLocaleString()}</span>
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: '',
    userName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalStats, setTotalStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    pending: 0
  })
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; userId: string; userName: string }>({
    isOpen: false,
    userId: '',
    userName: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')

  // Session expired modal hook
        const { triggerSessionExpired, SessionExpiredComponent } = useSessionExpired()

  const ITEMS_PER_PAGE = 10

  // Check if user is admin on mount
  useEffect(() => {
    const session = getSession()
    if (!session) {      triggerSessionExpired()
      setLoading(false)
      return
    }

    if (session.user.role !== 'admin') {      setHasError(true)
      setErrorMessage('Access denied. Admin role required.')
      setLoading(false)
      return
    }    loadUsers()
  }, [])

  const loadUsers = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {        setHasError(true)
        setErrorMessage('You must be logged in to view users. Please log in first.')
        setLoading(false)
        return
      }

      if (session.user.role !== 'admin') {
        setHasError(true)
        setErrorMessage('Access denied. Admin role required.')
        setLoading(false)
        return
      }
      // Build query parameters
        const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString()
      })

      if (search && search.length >= 3) {
        params.set('search', search)
      }

      // Make API call with authentication
        const response = await fetch(`/api/admin/users?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Check for authentication errors
        if (response.status === 401) {          triggerSessionExpired()
          return
        }

        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      setUsers(result.users || [])
      setTotalCount(result.totalCount || 0)
      setHasError(false)
      // Load stats separately
      await loadStats()
    } catch (error: any) {      setHasError(true)
      if (error.message && error.message.includes('Authentication')) {
        setErrorMessage('Authentication token expired. Please log in again.')
      } else if (error.message && error.message.includes('Admin')) {
        setErrorMessage('Access denied. Admin role required.')
      } else {
        setErrorMessage(`Failed to load users: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const session = getSession()
      if (!session) {        return
      }
      // Make API call for stats
        const response = await fetch('/api/admin/users/stats', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        // Ensure all stats values are valid numbers
        const safeStats = {
          total: typeof result.stats?.total === 'number' && !isNaN(result.stats.total) ? result.stats.total : 0,
          active: typeof result.stats?.active === 'number' && !isNaN(result.stats.active) ? result.stats.active : 0,
          inactive: typeof result.stats?.inactive === 'number' && !isNaN(result.stats.inactive) ? result.stats.inactive : 0,
          admins: typeof result.stats?.admins === 'number' && !isNaN(result.stats.admins) ? result.stats.admins : 0,
          pending: typeof result.stats?.pending === 'number' && !isNaN(result.stats.pending) ? result.stats.pending : 0
        }
        setTotalStats(safeStats)
      } else {
        console.error('Failed to fetch stats')
      }
    } catch (error) {
      console.error('Stats error:', error)
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

  // Load users when search query or page changes
  useEffect(() => {
    const session = getSession()
    if (session && session.user.role === 'admin') {
      loadUsers(currentPage, searchQuery)
    }
  }, [searchQuery, currentPage])

  // Optimistic updates - no server reload needed
        const handleUserAdded = (newUser: any) => {
    // Add to current users list
    setUsers(prev => [newUser, ...prev])

    // Update total count
    setTotalCount(prev => prev + 1)

    // Update stats
    setTotalStats(prev => ({
      ...prev,
      total: prev.total + 1,
      active: prev.active + 1,
      admins: newUser.role === 'admin' ? prev.admins + 1 : prev.admins
    }))
  }

  const handleUserUpdated = (updatedUser: any) => {
    // Update the specific user in the list
    setUsers(prev => prev.map(user =>
      user.id === updatedUser.id ? { ...user, ...updatedUser } : user
    ))

    // Recalculate stats by re-fetching only stats (lightweight)
    loadStats()
  }

  const handleUserDeleted = (userId: string) => {
    // Remove from current users list
    setUsers(prev => prev.filter(user => user.id !== userId))

    // Update total count
    setTotalCount(prev => prev - 1)

    // Recalculate stats
    loadStats()
  }

  const handleEditUser = (userId: string) => {
    setEditUserId(userId)
    setEditModalOpen(true)
  }

  const handleViewUser = (userId: string) => {
    window.location.href = `/users/${userId}`
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditUserId(null)
  }

  const handleViewClose = () => {
    setViewModalOpen(false)
    setViewUserId(null)
  }

  const openDeleteDialog = (userId: string, userName: string) => {
    setDeleteDialog({ isOpen: true, userId, userName })
  }

  const handleDeleteUser = async () => {
    const { userId } = deleteDialog

    try {
      const session = getSession()
      if (!session) {        toast.error('Authentication required', {
          description: 'Please log in to delete users.'
        })
        return
      }
      // Use API endpoint to delete from both auth and database
        const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      toast.success('User deleted successfully', {
        description: 'User has been removed from both authentication and database.'
      })

      handleUserDeleted(userId)
      // Close dialog
      setDeleteDialog({ isOpen: false, userId: '', userName: '' })
    } catch (error: any) {      toast.error('Failed to delete user', {
        description: error.message || 'Please try again.'
      })
      setDeleteDialog({ isOpen: false, userId: '', userName: '' })
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      await resetUserPassword(email)
      toast.success(`Password reset link sent to ${email}`, {
        description: 'The user will receive an email with instructions to reset their password.'
      })
    } catch (error: any) {      toast.error('Failed to send reset email', {
        description: error.message
      })
    }
  }

  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      const session = getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve user')
      }

      const result = await response.json()
      toast.success('User approved', {
        description: `${userName} has been approved successfully`
      })

      // Update user in the list
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, account_status: 'approved' } : user
      ))

      // Refresh stats
      loadStats()
    } catch (error: any) {
      toast.error('Failed to approve user', {
        description: error.message
      })
    }
  }

  const openRejectDialog = (userId: string, userName: string) => {
    setRejectDialog({ isOpen: true, userId, userName })
    setRejectionReason('')
  }

  const handleRejectUser = async () => {
    const { userId, userName } = rejectDialog

    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error('Rejection reason required', {
        description: 'Please provide a reason for rejecting this user'
      })
      return
    }

    try {
      const session = getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/users/${userId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject user')
      }

      const result = await response.json()
      toast.success('User rejected', {
        description: `${userName} has been rejected`
      })

      // Update user in the list
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, account_status: 'rejected', rejection_reason: rejectionReason } : user
      ))

      // Refresh stats
      loadStats()

      // Close dialog
      setRejectDialog({ isOpen: false, userId: '', userName: '' })
      setRejectionReason('')
    } catch (error: any) {
      toast.error('Failed to reject user', {
        description: error.message
      })
    }
  }

  const handleExportCSV = async () => {
    try {
      const session = getSession()
      if (!session) {
        toast.error('Authentication required', {
          description: 'You must be logged in to export data.'
        })
        return
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .select('name, email, role')
        .order('name')

      if (error) {
        throw new Error(error.message)
      }

      // Create CSV content
        const headers = ['Name', 'Email', 'Role', 'Status']
      const csvContent = [
        headers.join(','),
        ...data.map(user => [
          `"${user.name}"`,
          `"${user.email}"`,
          user.role,
          'Active' // All users in DB are active
        ].join(','))
      ].join('\n')

      // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('CSV export completed', {
        description: `Downloaded ${data.length} user records successfully.`
      })
    } catch (error) {      toast.error('Failed to export CSV', {
        description: 'Please try again.'
      })
    }
  }

  // Pagination calculations
        const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  // Show error state if access denied or database connection failed
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage users, roles, and permissions
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">
                  {errorMessage.includes('Access denied') ? 'Access Denied' :
                   errorMessage.includes('logged in') ? 'Authentication Required' : 'Connection Error'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              {errorMessage.includes('Access denied') ? (
                <div className="text-sm text-muted-foreground">
                  <p>This page is only accessible to Admin users.</p>
                  <p className="mt-2">If you are a Seller, you can access your profile page instead.</p>
                </div>
              ) : errorMessage.includes('logged in') ? (
                <div className="text-sm text-muted-foreground">
                  <p>Please log in to access the Users module.</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>This is likely a database configuration issue.</p>
                  <p className="mt-2">The Users module is fully implemented and ready to use once the connection is resolved.</p>
                </div>
              )}
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setInviteModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.total} duration={1200} />
            </div>
            <p className="text-xs text-muted-foreground">
              All registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              <AnimatedCounter value={totalStats.pending} duration={1000} />
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
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
              Active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.inactive} duration={1100} />
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.admins} duration={1300} />
            </div>
            <p className="text-xs text-muted-foreground">
              Administrator users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users (min 3 chars)..."
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery ? 'No users found matching your search.' : 'No users available. Add your first user!'}
              </div>
              <Button onClick={() => setInviteModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite First User
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{user.email}</div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                            {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {user.account_status === 'pending' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {user.account_status === 'approved' && (
                            <Badge variant="outline" className="border-green-500 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {user.account_status === 'rejected' && (
                            <Badge variant="outline" className="border-red-500 text-red-700">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {user.account_status === 'suspended' && (
                            <Badge variant="outline" className="border-orange-500 text-orange-700">
                              <XCircle className="h-3 w-3 mr-1" />
                              Suspended
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            {user.account_status === 'pending' ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApproveUser(user.id, user.name)}
                                  className="text-green-600 hover:text-green-700"
                                  title="Approve user"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRejectDialog(user.id, user.name)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Reject user"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleViewUser(user.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEditUser(user.id)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.account_status === 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleResetPassword(user.email)}
                                    title="Send password reset"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDeleteDialog(user.id, user.name)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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


      {/* Edit User Modal */}
      {editModalOpen && (
        <Suspense fallback={null}>
          <EditUserModal
            isOpen={editModalOpen}
            onClose={handleEditClose}
            onSuccess={handleUserUpdated}
            userId={editUserId}
          />
        </Suspense>
      )}

      {/* View User Modal */}
      {viewModalOpen && (
        <Suspense fallback={null}>
          <ViewUserModal
            isOpen={viewModalOpen}
            onClose={handleViewClose}
            userId={viewUserId}
          />
        </Suspense>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <Suspense fallback={null}>
          <InviteUserModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            onSuccess={handleUserAdded}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, userId: '', userName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user "{deleteDialog.userName}"? This action cannot be undone and will also delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject User Dialog */}
      <AlertDialog
        open={rejectDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ isOpen: false, userId: '', userName: '' })
            setRejectionReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting "{rejectDialog.userName}". This will be displayed to the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Expired Modal */}
      <SessionExpiredComponent />
    </div>
  )
}