'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function AuthStatusPage() {
  const { user, session, loading } = useAuth()
  const [sessionCheck, setSessionCheck] = useState<any>(null)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClientComponentClient()
      const { data, error } = await supabase.auth.getSession()
      setSessionCheck({ data, error })
      console.log('[AUTH_STATUS] Direct session check:', { data, error })
    }

    checkSession()
  }, [])

  if (loading) {
    return <div className="p-6">Loading auth status...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Status</h1>

      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h3 className="font-semibold">Auth Context Status</h3>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({
              hasUser: !!user,
              hasSession: !!session,
              userId: user?.id,
              userEmail: user?.email,
              loading,
              sessionExpiry: session?.expires_at,
              currentTime: new Date().toISOString()
            }, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-semibold">Direct Session Check</h3>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(sessionCheck, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h3 className="font-semibold">Browser Info</h3>
          <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({
              url: typeof window !== 'undefined' ? window.location.href : 'N/A',
              hasLocalStorage: typeof window !== 'undefined' && !!window.localStorage,
              localStorageKeys: typeof window !== 'undefined' ?
                Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-') || k.includes('auth')) : [],
              cookies: typeof document !== 'undefined' ? document.cookie : 'N/A'
            }, null, 2)}
          </pre>
        </div>

        {!user && (
          <div className="border-2 border-red-500 p-4 rounded bg-red-50">
            <h3 className="font-semibold text-red-700">Not Authenticated</h3>
            <p className="text-red-600">You are not logged in. Please go to <a href="/login" className="underline">/login</a> to authenticate.</p>
          </div>
        )}

        {user && (
          <div className="border-2 border-green-500 p-4 rounded bg-green-50">
            <h3 className="font-semibold text-green-700">Authenticated</h3>
            <p className="text-green-600">You are logged in as {user.email}. You can access protected routes.</p>
            <a href="/crm" className="underline text-blue-600">Go to CRM</a>
          </div>
        )}
      </div>
    </div>
  )
}