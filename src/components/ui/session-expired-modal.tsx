'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, LogOut, RefreshCcw } from 'lucide-react'
import { clearSession } from '@/lib/auth'

interface SessionExpiredModalProps {
  isOpen: boolean
  onClose?: () => void
  title?: string
  message?: string
  showRetry?: boolean
}

export function SessionExpiredModal({
  isOpen,
  onClose,
  title = "Session Expired",
  message = "Your session has expired for security reasons. Please log in again to continue.",
  showRetry = true
}: SessionExpiredModalProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Clear session
      clearSession()

      // Redirect to login page
      window.location.href = '/login'
    } catch (error) {
      // Force redirect anyway
      window.location.href = '/login'
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400 mt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center mt-6">
          {showRetry && (
            <Button
              variant="outline"
              onClick={handleRetry}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </Button>
          )}
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Login Again'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy usage
export function useSessionExpired() {
  const [showModal, setShowModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    title?: string
    message?: string
    showRetry?: boolean
  }>({})

  const triggerSessionExpired = (config?: {
    title?: string
    message?: string
    showRetry?: boolean
  }) => {
    setModalConfig(config || {})
    setShowModal(true)
  }

  const SessionExpiredComponent = () => (
    <SessionExpiredModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      {...modalConfig}
    />
  )

  return {
    triggerSessionExpired,
    SessionExpiredComponent
  }
}