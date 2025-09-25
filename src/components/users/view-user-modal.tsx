"use client"

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Shield,
  Eye,
  Calendar
} from 'lucide-react'

interface ViewUserModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

export function ViewUserModal({ isOpen, onClose, userId }: ViewUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    } else if (!isOpen) {
      setUser(null)
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return

    try {
      setLoading(true)
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
        setUser(data)
      }
    } catch (error: any) {
      console.error('Error loading user:', error)
      alert(`Failed to load user: ${error.message}`)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            View complete user information and account details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="mr-2" />
            Loading user data...
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-medium">{user.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-mono">{user.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="p-3 bg-muted rounded-md">
                  <Badge variant="default">Active</Badge>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Last Updated
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(user.updated_at)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User ID
                  </Label>
                  <div className="text-sm text-muted-foreground font-mono break-all">
                    {user.id}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground">User not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}