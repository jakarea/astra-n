"use client"

import { useState, useEffect, Suspense, lazy } from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Shield, User } from "lucide-react"
import { getSession } from '@/lib/auth'

// Lazy load simplified dashboard components
const SimpleAdminDashboard = lazy(() => import('@/components/dashboard/simple-admin-dashboard').then(module => ({ default: module.SimpleAdminDashboard })))
const SimpleSellerDashboard = lazy(() => import('@/components/dashboard/simple-seller-dashboard').then(module => ({ default: module.SimpleSellerDashboard })))

// Dashboard loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const session = getSession()
      if (!session) {
        setError('Please log in to access your dashboard')
        setLoading(false)
        return
      }

      // Get user role from session
      const role = session.user.role
      if (!role) {
        setError('User role not found. Please contact support.')
        setLoading(false)
        return
      }

      setUserRole(role)
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching user role:', error)
      setError('Failed to load user information')
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your personalized overview</p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render role-specific dashboard
  return (
    <div className="min-h-screen">
      {userRole === 'admin' && (
        <Suspense fallback={<DashboardSkeleton />}>
          <SimpleAdminDashboard />
        </Suspense>
      )}
      {userRole === 'seller' && (
        <Suspense fallback={<DashboardSkeleton />}>
          <SimpleSellerDashboard />
        </Suspense>
      )}

      {userRole && userRole !== 'admin' && userRole !== 'seller' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-8 w-8" />
              Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome to your dashboard</p>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your account role ({userRole}) does not have access to a specialized dashboard.
              Please contact your administrator for access.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}