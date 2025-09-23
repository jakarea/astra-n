"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const validateForm = () => {
    // Name validation
    if (!formData.name.trim()) {
      setError('👤 Name is required')
      return false
    }

    if (formData.name.trim().length < 2) {
      setError('👤 Name must be at least 2 characters long')
      return false
    }

    // Email validation
    if (!formData.email.trim()) {
      setError('📧 Email is required')
      return false
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(formData.email.trim())) {
      setError('📧 Please enter a valid email address (e.g., name@example.com)')
      return false
    }

    // Password validation
    if (!formData.password) {
      setError('🔒 Password is required')
      return false
    }

    if (formData.password.length < 8) {
      setError('🔒 Password must be at least 8 characters long')
      return false
    }

    // Enhanced password validation
    const hasLetter = /[a-zA-Z]/.test(formData.password)
    const hasNumber = /[0-9]/.test(formData.password)

    if (!hasLetter || !hasNumber) {
      setError('🔒 Password must contain at least one letter and one number')
      return false
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('🔒 Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError('')

    try {
      console.log('Starting registration process...')

      // Call our API route for registration
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        })
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle error without throwing - directly set the error message
        let errorMessage = 'Error during registration'

        if (result.error) {
          // Check for specific error codes first, then fallback to message content
          if (result.code === 'EMAIL_ALREADY_EXISTS' || result.error.includes('User already registered')) {
            errorMessage = '⚠️ This email is already registered. Try logging in or use a different email.'
          } else if (result.code === 'WEAK_PASSWORD' || result.error.includes('Password should be')) {
            errorMessage = '🔒 Password must be more secure. Use at least 8 characters with letters and numbers.'
          } else if (result.code === 'INVALID_EMAIL' || result.error.includes('Invalid email')) {
            errorMessage = '📧 Invalid email address. Check the formatting.'
          } else if (result.code === 'RATE_LIMITED' || result.error.includes('Too many requests')) {
            errorMessage = '⏰ Too many registration attempts. Please try again in a few minutes.'
          } else {
            errorMessage = 'Registration error. Please try again later.'
          }
        }

        setError(errorMessage)
        return // Exit early, don't continue with the rest of the function
      }

      if (result.success) {
        // Check if email confirmation is required
        if (result.needsEmailConfirmation) {
          setSuccess('Registration completed! Check your email to confirm your account.')
        } else {
          // If no email confirmation required, redirect to dashboard
          setSuccess('Registration completed! Redirecting...')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        }
      }

    } catch (error) {
      console.error('Network or unexpected error:', error)
      // Only handle network/fetch errors here, since API errors are handled above
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Network'))) {
        setError('Connection error. Check your internet connection.')
      } else {
        setError('Unexpected error. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Astra</h1>
          <p className="mt-2 text-sm text-muted-foreground">E-commerce Dashboard</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Registration</CardTitle>
            <CardDescription className="text-center">
              Create a new account to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-600 bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-100">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}