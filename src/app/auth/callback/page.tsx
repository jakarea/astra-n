'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, UserPlus } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const type = searchParams.get('type')
  const email = searchParams.get('email')
  const _userId = searchParams.get('userId')

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      setLoading(true)

      // Handle Supabase auth callback first
        const { data, error } = await supabase.auth.getSession()

      if (error) {        setError('Authentication failed. Please try again.')
        setLoading(false)
        return
      }

      if (type === 'invite' && !data.session) {
      // User clicked the invitation link but needs to set password
        setNeedsPassword(true)
        setLoading(false)
        return
      }

      if (data.session) {
      // User is authenticated, redirect to dashboard
        setSuccess('Successfully logged in! Redirecting...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError('No active session found. Please try logging in again.')
      }
    } catch (error: any) {      setError('An error occurred during authentication.')
    } finally {
      setLoading(false)
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
      setLoading(true)
      setError('')

      // Try to sign up the user with the provided password
        const { data, error: signupError } = await supabase.auth.signUp({
        email: email!,
        password: password
      })

      if (signupError) {
        throw signupError
      }

      if (data.user) {
        setSuccess('Account created successfully! Please check your email to confirm your account.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (error: any) {      setError(error.message || 'Failed to set up account')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Processing your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Complete Your Invitation
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You've been invited to join our platform. Set up your password to continue.
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
                <Input value={email || ''} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            {success ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-center text-sm text-muted-foreground">{success}</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-center text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => router.push('/login')} variant="outline">
                  Go to Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}