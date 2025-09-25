'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  User,
  Mail,
  Shield,
  MessageCircle
} from 'lucide-react'

interface UserEditData {
  id: string
  name: string
  email: string
  role: string
  webhook_secret?: string
  created_at: string
  updated_at: string
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserEditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    webhook_secret: ''
  })

  useEffect(() => {
    const checkAdminAndLoadUser = async () => {
      try {
        const session = await getSession()
        if (!session || !(await isAdmin())) {
          router.push('/auth/login')
          return
        }

        await loadUser()
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/auth/login')
      }
    }

    checkAdminAndLoadUser()
  }, [userId, router])

  const loadUser = async () => {
    try {
      setLoading(true)
      const session = await getSession()
      if (!session) {
        throw new Error('No session found')
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to load user: ${errorData}`)
      }

      const data = await response.json()
      setUser(data.user)
      setFormData({
        name: data.user.name || '',
        email: data.user.email || '',
        role: data.user.role || 'user',
        webhook_secret: data.user.webhook_secret || ''
      })
    } catch (error: any) {
      console.error('Error loading user:', error)
      toast.error(error.message || "Failed to load user data")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const session = await getSession()
      if (!session) {
        throw new Error('No session found')
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to update user: ${errorData}`)
      }

      const data = await response.json()
      setUser(data.user)

      toast.success("User updated successfully")

      // Redirect back to user detail page
      router.push(`/users/${userId}`)
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || "Failed to update user")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">User Not Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The requested user could not be found.
              </p>
              <Button onClick={() => router.push('/users')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div>
            <h1 className="text-2xl font-bold">Edit User</h1>
            <p className="text-muted-foreground">
              Update user information and permissions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/users/${userId}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Update the user's basic information and role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Webhook Secret Field */}
          <div className="space-y-2">
            <Label htmlFor="webhook_secret" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Webhook Secret
            </Label>
            <Textarea
              id="webhook_secret"
              value={formData.webhook_secret}
              onChange={(e) => handleInputChange('webhook_secret', e.target.value)}
              placeholder="Enter webhook secret (optional)"
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Used for secure webhook authentication from external services.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>User Metadata</CardTitle>
          <CardDescription>
            Read-only information about the user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">User ID</Label>
              <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(user.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}