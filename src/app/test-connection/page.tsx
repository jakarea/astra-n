'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const testConnection = async () => {
    setTesting(true)
    const tests: any = {}

    try {
      // Test 1: Check environment variables
      tests.env = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }

      // Test 2: Create client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      tests.client = { status: 'created' }

      // Test 3: Simple network test with timeout
      console.log('[TEST] Testing basic connectivity...')
      const networkPromise = fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        }
      })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 5000)
      )

      try {
        const response = await Promise.race([networkPromise, timeoutPromise]) as Response
        tests.network = {
          status: 'success',
          statusCode: response.status,
          statusText: response.statusText
        }
      } catch (networkError) {
        tests.network = {
          status: 'error',
          error: networkError.message
        }
      }

      // Test 4: Auth session with timeout
      console.log('[TEST] Testing auth session...')
      const sessionPromise = supabase.auth.getSession()
      const sessionTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 3000)
      )

      try {
        const { data, error } = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any
        tests.session = {
          status: error ? 'error' : 'success',
          hasSession: !!data?.session,
          error: error?.message
        }
      } catch (sessionError) {
        tests.session = {
          status: 'timeout',
          error: sessionError.message
        }
      }

      // Test 5: Simple table query
      console.log('[TEST] Testing table query...')
      try {
        const queryPromise = supabase
          .from('crm_leads')
          .select('id')
          .limit(1)
        const queryTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 3000)
        )

        const { data, error } = await Promise.race([queryPromise, queryTimeoutPromise]) as any
        tests.query = {
          status: error ? 'error' : 'success',
          dataCount: data?.length || 0,
          error: error?.message
        }
      } catch (queryError) {
        tests.query = {
          status: 'timeout',
          error: queryError.message
        }
      }

      setResults(tests)
    } catch (error) {
      console.error('[TEST] Error during testing:', error)
      setResults({ error: error.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

      <button
        onClick={testConnection}
        disabled={testing}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Run Connection Test'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          {Object.entries(results).map(([test, result]: [string, any]) => (
            <div key={test} className="border p-4 rounded">
              <h3 className="font-semibold capitalize">{test} Test</h3>
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}