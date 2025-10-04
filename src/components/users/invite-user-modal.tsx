"use client"

import { useState } from 'react'
import { inviteUser, UserRole, isAdmin } from '@/lib/auth'
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
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newUser: any) => void
}

interface FormData {
  email: string
  role: UserRole
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const userIsAdmin = isAdmin()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    role: 'seller'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!formData.email) {
        setError('Email is required')
        setLoading(false)
        return
      }

      // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      // Ensure sellers can only invite with 'seller' role
        const inviteRole = userIsAdmin ? formData.role : 'seller'
      await inviteUser(formData.email.trim().toLowerCase(), inviteRole)

      // Create a temporary user object for optimistic update
        const newUser = {
        id: crypto.randomUUID(),
        name: formData.email.split('@')[0],
        email: formData.email.trim().toLowerCase(),
        role: inviteRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Show success message
      if (userIsAdmin) {
        setSuccess(`Invitation sent successfully to ${formData.email} with ${inviteRole} role`)
      } else {
        setSuccess(`Invitation email sent to ${formData.email} with ${inviteRole} role. They will receive an email to complete their signup.`)
      }

      // Reset form after a short delay to show success message
      setTimeout(() => {
        setFormData({
          email: '',
          role: 'seller'
        })
        setSuccess('')
        onSuccess(newUser)
        onClose()
      }, 2000)

    } catch (error: any) {      setError(error.message || 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError('')
      setSuccess('')
      setFormData({
        email: '',
        role: 'seller'
      })
      onClose()
    }
  }

  const isFormValid = formData.email.trim() && (userIsAdmin ? formData.role : true)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to a new user. They will receive an email with instructions to set up their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }))
                  setError('')
                  setSuccess('')
                }}
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                The user will receive an invitation email to set up their account
              </p>
            </div>

            {/* Only show role selection for admin users */}
            {userIsAdmin && (
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => {
                    setFormData(prev => ({ ...prev, role: value }))
                    setError('')
                    setSuccess('')
                  }}
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
            )}

            {/* Show info message for sellers */}
            {!userIsAdmin && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Role
                </Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    New user will be assigned <strong>Seller</strong> role
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted rounded-md">
            <h4 className="font-medium mb-2">What happens next?</h4>
            {userIsAdmin ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• User receives an invitation email</li>
                <li>• They click the link to set up their password</li>
                <li>• Account is automatically created with the selected role</li>
                <li>• User can immediately start using the system</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• User receives an invitation email</li>
                <li>• They click the link to complete signup</li>
                <li>• User sets up their password</li>
                <li>• Account is automatically activated with seller role</li>
              </ul>
            )}
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
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}