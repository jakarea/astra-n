"use client"

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession, UserRole } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  User,
  Mail,
  Shield,
  Edit
} from 'lucide-react'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedUser: any) => void
  userId: string | null
}

interface FormData {
  name: string
  email: string
  role: UserRole
}

export function EditUserModal({ isOpen, onClose, onSuccess, userId }: EditUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'seller'
  })

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return

    try {
      setInitialLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setFormData({
          name: data.name,
          email: data.email,
          role: data.role
        })
      }
    } catch (error: any) {
      console.error('Error loading user:', error)
      alert(`Failed to load user: ${error.message}`)
      onClose()
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)

    try {
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Validate required fields
      if (!formData.name || !formData.email || !formData.role) {
        throw new Error('All fields are required')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      }

      console.log('[EDIT_USER] Updating user with data:', userData)

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select()
        .single()

      console.log('[EDIT_USER] Update result:', { data, error })

      if (error) {
        console.error('[EDIT_USER] Update error:', error)
        if (error.code === '23505') {
          throw new Error('A user with this email already exists.')
        }
        throw new Error(error.message)
      }

      // Pass the updated user data to parent
      onSuccess(data)
      onClose()
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`Failed to update user: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading && !initialLoading) {
      onClose()
    }
  }

  const isFormValid = formData.name.trim() &&
                     formData.email.trim() &&
                     formData.role

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information and role
          </DialogDescription>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="mr-2" />
            Loading user data...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Seller
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading || initialLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || initialLoading || !isFormValid}>
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}