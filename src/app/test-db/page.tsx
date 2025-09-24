'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'

export default function TestDbPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<unknown>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testDatabase() {
      if (!user) {
        setResults({ error: 'User not authenticated' })
        setLoading(false)
        return
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const tests: any = {}

      try {
        // Test 1: Check if we can connect to Supabase
        console.log('[TEST] Testing Supabase connection...')
        tests.connection = { status: 'success', message: 'Supabase client created' }

        // Test 2: List all tables we can access
        console.log('[TEST] Checking accessible tables...')
        try {
          const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')

          if (tablesError) {
            // If we can't query information_schema, try specific tables
            tests.tables = { status: 'limited', error: tablesError.message }
          } else {
            tests.tables = { status: 'success', data: tables }
          }
        } catch (e) {
          tests.tables = { status: 'error', error: e.message }
        }

        // Test 3: Try to query crm_leads table specifically
        console.log('[TEST] Testing crm_leads table...')
        try {
          const { data: leads, error: leadsError } = await supabase
            .from('crm_leads')
            .select('id, name, created_at')
            .limit(5)

          tests.crm_leads = {
            status: leadsError ? 'error' : 'success',
            data: leads,
            error: leadsError?.message,
            count: leads?.length || 0
          }
        } catch (e) {
          tests.crm_leads = { status: 'error', error: e.message }
        }

        // Test 4: Try to query users table
        console.log('[TEST] Testing users table...')
        try {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, name, email')
            .limit(5)

          tests.users = {
            status: usersError ? 'error' : 'success',
            data: users,
            error: usersError?.message,
            count: users?.length || 0
          }
        } catch (e) {
          tests.users = { status: 'error', error: e.message }
        }

        // Test 5: Check current user info
        tests.current_user = {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata
        }

        console.log('[TEST] All tests completed:', tests)
        setResults(tests)
      } catch (error) {
        console.error('[TEST] Error during testing:', error)
        setResults({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    testDatabase()
  }, [user])

  if (loading) {
    return <div className="p-6">Testing database connection...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Database Connection Test</h1>

      <div className="space-y-4">
        {Object.entries(results).map(([test, result]: [string, any]) => (
          <div key={test} className="border p-4 rounded">
            <h3 className="font-semibold capitalize">{test.replace('_', ' ')}</h3>
            <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}