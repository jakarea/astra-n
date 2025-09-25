'use client'

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession, resetUserPassword, inviteUser, UserRole } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading'
import { Badge } from '@/components/ui/badge'
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
import { User, Mail, Shield, Save, RotateCcw, Send } from 'lucide-react'
import { InviteUserModal } from '@/components/users/invite-user-modal'

interface ProfileData {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  // Load profile data on mount
  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        setHasError(true)
        setErrorMessage('You must be logged in to view your profile.')
        setLoading(false)
        return
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setProfile(data)
        setFormData({
          name: data.name,
          email: data.email
        })
        setHasError(false)
      }
    } catch (error: any) {
      console.error('[PROFILE] Error loading profile:', error)
      setHasError(true)
      setErrorMessage('Failed to load profile data.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      setSaving(true)
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Name is required')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase()
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already in use by another user.')
        }
        throw new Error(error.message)
      }

      if (data) {
        setProfile(data)
        alert('Profile updated successfully!')
      }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!profile?.email) return

    try {
      await resetUserPassword(profile.email)
      setResetPasswordDialog(false)
      alert(`Password reset link sent to ${profile.email}`)
    } catch (error: any) {
      console.error('Error resetting password:', error)
      alert(`Failed to send reset email: ${error.message}`)
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

  const isFormChanged = profile && (
    formData.name !== profile.name ||
    formData.email !== profile.email
  )

  // Show error state if not authenticated or database connection failed
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and account settings
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">
                  {errorMessage.includes('logged in') ? 'Authentication Required' : 'Error Loading Profile'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Please try refreshing the page or logging in again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and account settings
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="mr-2" />
              Loading profile...
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
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setInviteModalOpen(true)} variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                  <p className="text-xs text-muted-foreground">
                    Changing your email may require verification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role
                  </Label>
                  <div>
                    <Badge variant={profile?.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {profile?.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {profile?.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact an administrator to change your role
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving || !isFormChanged}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setResetPasswordDialog(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge variant="default">Active</Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Member Since</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {profile && formatDate(profile.created_at)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Last Updated</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {profile && formatDate(profile.updated_at)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">User ID</Label>
                <div className="mt-1 text-xs text-muted-foreground font-mono break-all">
                  {profile?.id}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          // Handle success if needed - maybe show a toast
          console.log('User invited successfully from profile page')
        }}
      />

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset your password? A reset link will be sent to your email address: {profile?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Send Reset Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}