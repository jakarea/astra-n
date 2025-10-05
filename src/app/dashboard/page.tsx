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
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>

      {/* Date Range Filter Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-10 w-[200px]" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        const session = getSession()
        if (!session) {
          setError('Please log in to access your dashboard')
          setLoading(false)
          return
        }

        // Try to get role from session first (fastest)
        const cachedRole = session.user.role
        if (cachedRole && cachedRole !== 'pending') {
          setUserRole(cachedRole)
          setLoading(false)
          return
        }

        // Only query database if role is not in session or needs verification
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            }
          }
        )

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, account_status')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          setError('Failed to load user information')
          setLoading(false)
          return
        }

        // Check if account is pending approval
        if (userData.account_status === 'pending' || userData.account_status === 'rejected' || userData.account_status === 'suspended') {
          window.location.href = '/pending-approval'
          return
        }

        // Get user role from database
        const role = userData.role
        if (!role) {
          setError('User role not found. Please contact support.')
          setLoading(false)
          return
        }

        setUserRole(role)
        setLoading(false)
      } catch (error: any) {
        setError('Failed to load user information')
        setLoading(false)
      }
    }

    checkAccountStatus()
  }, [])

  if (loading) {
    return <DashboardSkeleton />
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