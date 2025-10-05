"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, XCircle, Mail, LogOut } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export default function PendingApprovalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accountStatus, setAccountStatus] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    checkAccountStatus()
  }, [])

  const checkAccountStatus = async () => {
    try {
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Create supabase client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error } = await supabase
        .from('users')
        .select('account_status, email, rejection_reason')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      setAccountStatus(data.account_status)
      setUserEmail(data.email)
      setRejectionReason(data.rejection_reason)

      // If approved, redirect to dashboard
      if (data.account_status === 'approved') {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking account status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('session')
    window.location.href = '/login'
  }

  const handleRefresh = () => {
    setLoading(true)
    checkAccountStatus()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span>Checking status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Format time for digital clock
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-[#53a244]/5 p-6">
      {/* Digital Clock Display */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
        <div className="text-center space-y-2">
          <div className="text-6xl font-bold text-[#171717] tracking-tight font-mono bg-white/50 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-sm">
            {formatTime(currentTime)}
          </div>
          <div className="text-base text-gray-500 font-medium">
            {formatDate(currentTime)}
          </div>
        </div>
      </div>

      <Card className="w-full max-w-2xl shadow-xl border-0 bg-white">
        <CardHeader className="text-center pb-6 pt-12 px-8">
          {accountStatus === 'pending' && (
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-[#53a244]/20 rounded-full blur-2xl"></div>
                <div className="relative rounded-full bg-white border-4 border-[#53a244]/30 p-8">
                  <Clock className="h-20 w-20 text-[#53a244] animate-pulse" />
                </div>
              </div>
            </div>
          )}
          {accountStatus === 'rejected' && (
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl"></div>
                <div className="relative rounded-full bg-white border-4 border-red-200 p-8">
                  <XCircle className="h-20 w-20 text-red-600" />
                </div>
              </div>
            </div>
          )}
          {accountStatus === 'suspended' && (
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl"></div>
                <div className="relative rounded-full bg-white border-4 border-orange-200 p-8">
                  <XCircle className="h-20 w-20 text-orange-600" />
                </div>
              </div>
            </div>
          )}

          <CardTitle className="text-4xl font-bold text-[#171717] mb-3">
            {accountStatus === 'pending' && 'Account Pending Approval'}
            {accountStatus === 'rejected' && 'Account Rejected'}
            {accountStatus === 'suspended' && 'Account Suspended'}
          </CardTitle>
          <CardDescription className="text-lg text-gray-500">
            {userEmail}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 px-8 pb-8">
          {accountStatus === 'pending' && (
            <>
              <Alert className="bg-[#53a244]/8 border-2 border-[#53a244]/20 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-[#53a244]" />
                <AlertDescription className="text-[#171717]">
                  <div className="font-bold mb-3 text-lg">Thank you for registering!</div>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Your account has been created successfully and is currently under review by our admin team.
                    We typically review new accounts within 24-48 hours.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-[#171717] mb-4 text-lg flex items-center gap-3">
                  <div className="p-2 bg-[#53a244]/10 rounded-lg">
                    <Mail className="h-5 w-5 text-[#53a244]" />
                  </div>
                  What happens next?
                </h3>
                <ul className="text-base text-gray-600 space-y-3 ml-12">
                  <li className="flex items-start gap-3">
                    <span className="text-[#53a244] mt-1">•</span>
                    <span>Our admin team will review your account details</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#53a244] mt-1">•</span>
                    <span>You'll receive an email notification once your account is approved</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#53a244] mt-1">•</span>
                    <span>After approval, you'll have full access to the platform</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#53a244] mt-1">•</span>
                    <span>You can refresh this page to check your approval status</span>
                  </li>
                </ul>
              </div>
            </>
          )}

          {accountStatus === 'rejected' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Account Rejected</div>
                  <p className="text-sm">
                    Unfortunately, your account registration was not approved.
                  </p>
                </AlertDescription>
              </Alert>

              {rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Reason:</h3>
                  <p className="text-sm text-red-800">{rejectionReason}</p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Need help?</h3>
                <p className="text-sm text-gray-700">
                  If you believe this was a mistake or would like to discuss your application,
                  please contact our support team.
                </p>
              </div>
            </>
          )}

          {accountStatus === 'suspended' && (
            <>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Account Suspended</div>
                  <p className="text-sm">
                    Your account has been temporarily suspended. Please contact support for more information.
                  </p>
                </AlertDescription>
              </Alert>

              {rejectionReason && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Reason:</h3>
                  <p className="text-sm text-orange-800">{rejectionReason}</p>
                </div>
              )}
            </>
          )}

          <div className="flex gap-4 pt-6">
            {accountStatus === 'pending' && (
              <Button
                onClick={handleRefresh}
                className="flex-1 bg-[#53a244] hover:bg-[#53a244]/90 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Check Status
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 h-12 text-base font-semibold transition-all"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>

          <div className="text-center pt-8 mt-6 border-t border-gray-100">
            <p className="text-base text-gray-500">
              Need assistance? Contact us at <br className="sm:hidden" />
              <a href="mailto:support@astra.com" className="text-[#53a244] font-semibold hover:underline ml-1">support@astra.com</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
