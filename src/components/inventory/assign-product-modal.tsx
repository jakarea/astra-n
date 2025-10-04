'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Search, AlertCircle, Users, CheckCircle2 } from 'lucide-react'

interface AssignProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  productId: string | null
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isAssigned: boolean
}

export function AssignProductModal({ isOpen, onClose, onSuccess, productId }: AssignProductModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && productId) {
      loadData()
    } else {
      // Reset state when modal closes
      setUsers([])
      setProduct(null)
      setSelectedUsers(new Set())
      setSearchQuery('')
      setError(null)
    }
  }, [isOpen, productId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const session = getSession()

      console.log('🔍 Session check:', { hasSession: !!session, userId: session?.user?.id })
      if (!session) {
        throw new Error('No session found')
      }

      const supabase = getAuthenticatedClient()
      console.log('🔗 Supabase client created')

      // Test Supabase client authentication
      console.log('🧪 Testing Supabase auth...')
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      console.log('🧪 Auth test result:', {
        authUser: authUser?.user ? {
          id: authUser.user.id,
          email: authUser.user.email,
          role: authUser.user.user_metadata?.role
        } : null,
        authError: authError?.message
      })

      // Load product details
      console.log('📦 Loading product details for ID:', productId)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('id', productId)
        .single()

      console.log('📦 Product query result:', { productData, productError })
      if (productError) throw new Error(`Failed to load product: ${productError.message}`)
      setProduct(productData)

      // Try admin API approach first (like User Management page)
      console.log('👥 Trying admin API approach...')
      let usersData = null
      let usersError = null

      try {
        const response = await fetch('/api/admin/users?limit=1000', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          }
        })

        console.log('👥 Admin API response status:', response.status)

        if (response.ok) {
          const result = await response.json()
          usersData = result.users || []
          console.log('👥 Admin API success:', {
            count: usersData.length,
            method: result.method,
            users: usersData.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
          })
        } else {
          const errorData = await response.json()
          console.log('👥 Admin API failed, trying direct query...', errorData)
          throw new Error(`Admin API failed: ${errorData.error}`)
        }
      } catch (apiError: any) {
        console.log('👥 Admin API error, falling back to direct query:', apiError.message)

        // Fallback to direct Supabase query
        console.log('👥 Using direct Supabase query fallback...')
        const { data: directData, error: directError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .order('name')

        console.log('👥 Direct query result:', {
          data: directData,
          error: directError,
          count: directData?.length
        })

        usersData = directData
        usersError = directError
      }

      console.log('👥 Users query result:', {
        usersData,
        usersError,
        count: usersData?.length,
        roles: usersData?.map(u => u.role),
        userDetails: usersData?.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
      })

      if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        throw new Error(`Failed to load users: ${usersError.message}`)
      }

      if (!usersData || usersData.length === 0) {
        console.warn('⚠️ No users found in database')
        console.log('🔍 Debug: usersData is:', usersData)
        console.log('🔍 Debug: usersData type:', typeof usersData)
        console.log('🔍 Debug: usersData length:', usersData?.length)
        toast.error('No users found', {
          description: 'No users were found in the database'
        })
        setUsers([])
        setSelectedUsers(new Set())
        return
      }

      // Load current assignments for this product
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('seller_products')
        .select('seller_id')
        .eq('product_id', productId)

      if (assignmentsError) throw assignmentsError

      const assignedUserIds = new Set(assignmentsData.map(a => a.seller_id))

      // Combine users data with assignment status
      const usersWithAssignment = usersData.map(user => ({
        ...user,
        isAssigned: assignedUserIds.has(user.id)
      }))

      console.log('👥 Final users with assignment status:', {
        count: usersWithAssignment.length,
        users: usersWithAssignment.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isAssigned: u.isAssigned
        })),
        assignedUserIds: Array.from(assignedUserIds)
      })

      setUsers(usersWithAssignment)

      // Set initially selected users (those currently assigned)
      setSelectedUsers(new Set(Array.from(assignedUserIds)))

      console.log('✅ Modal state updated:', {
        usersSet: usersWithAssignment.length,
        selectedUsersSet: assignedUserIds.size
      })

    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(error.message || 'Failed to load data')
      toast.error('Failed to load data', {
        description: error.message || 'Please try again or contact support'
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase().trim()
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  const handleUserToggle = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (checked) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      // Deselect all filtered users
      const newSelected = new Set(selectedUsers)
      filteredUsers.forEach(user => newSelected.delete(user.id))
      setSelectedUsers(newSelected)
    } else {
      // Select all filtered users
      const newSelected = new Set(selectedUsers)
      filteredUsers.forEach(user => newSelected.add(user.id))
      setSelectedUsers(newSelected)
    }
  }

  const handleSave = async () => {
    if (!productId) return

    try {
      setSaving(true)
      const session = getSession()
      if (!session) return

      const supabase = getAuthenticatedClient()

      // Get current assignments
      const currentlyAssigned = new Set(users.filter(u => u.isAssigned).map(u => u.id))
      const newAssignments = selectedUsers

      // Find users to add and remove
      const usersToAdd = Array.from(newAssignments).filter(id => !currentlyAssigned.has(id))
      const usersToRemove = Array.from(currentlyAssigned).filter(id => !newAssignments.has(id))

      // Remove assignments
      if (usersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('seller_products')
          .delete()
          .eq('product_id', productId)
          .in('seller_id', usersToRemove)

        if (removeError) throw removeError
      }

      // Add new assignments
      if (usersToAdd.length > 0) {
        const newAssignmentRecords = usersToAdd.map(userId => ({
          seller_id: userId,
          product_id: parseInt(productId),
          assigned_by: session.user.id
        }))

        const { error: addError } = await supabase
          .from('seller_products')
          .insert(newAssignmentRecords)

        if (addError) throw addError
      }

      toast.success('Product assignments updated successfully')
      onSuccess()

    } catch (error: any) {
      console.error('Error saving assignments:', error)
      toast.error('Failed to update assignments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Product to Users</DialogTitle>
          <DialogDescription>
            Select which users should have access to this product.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button variant="outline" size="sm" onClick={loadData} className="ml-4">
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {product && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Product:</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{product.sku}</Badge>
                  <span className="font-medium">{product.name}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assign to Users ({users.length} found)
                </h4>
                {filteredUsers.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium mb-2">No users found</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    There are no users in the system.
                  </p>
                  <Button variant="outline" size="sm" onClick={loadData}>
                    Refresh
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Users List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-6">
                        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No users match your search query.
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={user.id}
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <label
                              htmlFor={user.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                            >
                              {user.name}
                              <Badge variant="outline" className="text-xs">{user.role}</Badge>
                              {selectedUsers.has(user.id) && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2">
                              {user.isAssigned && (
                                <Badge variant="secondary" className="text-xs">Currently Assigned</Badge>
                              )}
                              {selectedUsers.has(user.id) && !user.isAssigned && (
                                <Badge variant="default" className="text-xs">Will be Assigned</Badge>
                              )}
                              {!selectedUsers.has(user.id) && user.isAssigned && (
                                <Badge variant="destructive" className="text-xs">Will be Unassigned</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Selection Summary */}
                  {selectedUsers.size > 0 && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium">
                        {selectedUsers.size} user(s) selected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Changes will be applied when you save.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving || !product || error}
          >
            {saving ? 'Saving...' : `Save Assignments (${selectedUsers.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}