"use client"

import { useState } from 'react'
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
  Plus
} from 'lucide-react'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newUser: any) => void
}

interface FormData {
  name: string
  email: string
  role: UserRole
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: 'seller'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      // Generate a random UUID for the new user (since Supabase auth creates the actual user)
      const userId = crypto.randomUUID()

      const userData = {
        id: userId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      }

      console.log('[ADD_USER] Creating user with data:', userData)

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single()

      console.log('[ADD_USER] Insert result:', { data, error })

      if (error) {
        console.error('[ADD_USER] Insert error:', error)
        if (error.code === '23505') {
          throw new Error('A user with this email already exists.')
        }
        throw new Error(error.message)
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'seller'
      })

      // Pass the new user data to parent
      onSuccess(data)
      onClose()
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(`Failed to create user: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
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
            <Plus className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account in the system
          </DialogDescription>
        </DialogHeader>

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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}