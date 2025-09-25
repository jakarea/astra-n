'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [user, setUser] = useState<any>(null)

  const isInvited = searchParams.get('invited') === 'true'

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      setLoading(true)

      // Get the current session from the URL hash (email confirmation)
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth session error:', error)
        setError('Authentication failed. Please try the invitation link again.')
        setLoading(false)
        return
      }

      if (data.session && data.session.user) {
        setUser(data.session.user)

        // If user is already confirmed, create database record and redirect
        if (data.session.user.email_confirmed_at && !isInvited) {
          await createUserRecord(data.session.user)
          setSuccess('Account confirmed! Redirecting to login...')
          setTimeout(() => router.push('/login'), 2000)
          return
        }

        // User needs to set a new password (invitation flow)
        setLoading(false)
      } else {
        setError('No active session found. Please try the invitation link again.')
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Callback handling error:', error)
      setError('An error occurred during authentication.')
      setLoading(false)
    }
  }

  const createUserRecord = async (authUser: any) => {
    try {
      const metadata = authUser.user_metadata || {}

      // Create user record in database
      const { error } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          name: metadata.name || authUser.email?.split('@')[0] || 'New User',
          role: metadata.role || 'seller'
        }])

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Database insert error:', error)
      }
    } catch (error) {
      console.error('Error creating user record:', error)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      setUpdating(true)
      setError('')

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      // Create user record in database
      if (user) {
        await createUserRecord(user)
      }

      setSuccess('Password set successfully! Redirecting to login...')
      toast.success('Account setup completed successfully!')

      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (error: any) {
      console.error('Password setup error:', error)
      setError(error.message || 'Failed to set up password')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">
                Processing your invitation...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center text-sm text-muted-foreground">{success}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-center text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/login')} variant="outline">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Set Your Password
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Welcome! Please set a secure password for your account.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={updating}>
              {updating ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
              Set Password & Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}