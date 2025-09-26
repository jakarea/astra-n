"use client"

import { useState } from 'react'
import { resetUserPassword } from '@/lib/auth'
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
import { RotateCcw, Mail, AlertCircle, CheckCircle } from 'lucide-react'

interface ResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export function ResetPasswordModal({ isOpen, onClose, initialEmail = '' }: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState(initialEmail)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!email) {
        setError('Email is required')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      console.log('[RESET_PASSWORD_MODAL] Sending password reset to:', email)

      await resetUserPassword(email.trim().toLowerCase())

      // Show success message
      setSuccess(`Password reset link sent to ${email}. Please check your email and follow the instructions.`)

      // Reset form after a short delay to show success message
      setTimeout(() => {
        setEmail('')
        setSuccess('')
        onClose()
      }, 3000)

    } catch (error: any) {
      console.error('Error sending password reset:', error)
      setError(error.message || 'Failed to send password reset')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError('')
      setSuccess('')
      setEmail('')
      onClose()
    }
  }

  const isFormValid = email.trim()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Send Password Reset
          </DialogTitle>
          <DialogDescription>
            Send a password reset email to a user. They will receive an email with instructions to reset their password.
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

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
                setSuccess('')
              }}
              placeholder="user@example.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              The user will receive an email with a password reset link
            </p>
          </div>

          <div className="p-4 bg-muted rounded-md">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• User receives a password reset email</li>
              <li>• They click the link to go to the reset page</li>
              <li>• User enters their new password</li>
              <li>• Password is updated and they can login with the new password</li>
            </ul>
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
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}