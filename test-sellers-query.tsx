'use client'

import { useState } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TestSellersQuery() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testQueries = async () => {
    try {
      setLoading(true)
      const session = getSession()
      console.log('🔍 Session:', session)

      if (!session) {
        setResult({ error: 'No session found' })
        return
      }

      const supabase = getAuthenticatedClient()
      console.log('🔗 Supabase client created')

      // Test 1: Get all users (raw query)
      console.log('📋 Query 1: Getting all users...')
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*')

      console.log('📋 All users result:', { data: allUsers, error: allUsersError })

      // Test 2: Get users with specific role query
      console.log('📋 Query 2: Getting sellers specifically...')
      const { data: sellers, error: sellersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'seller')

      console.log('📋 Sellers result:', { data: sellers, error: sellersError })

      // Test 3: Count by role
      console.log('📋 Query 3: Counting by role...')
      const { data: allUsersForCount, error: countError } = await supabase
        .from('users')
        .select('role')

      const roleCounts = allUsersForCount?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Test 4: Check RLS policies
      console.log('📋 Query 4: Testing with different approaches...')

      // Try case insensitive
      const { data: sellersCI, error: sellersCIError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .ilike('role', 'seller')

      // Try with no filters first
      const { data: allFirst, error: allFirstError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .limit(10)

      setResult({
        session: {
          userId: session.user.id,
          userRole: session.user.role,
          hasSession: !!session
        },
        test1_allUsers: {
          data: allUsers,
          error: allUsersError?.message,
          count: allUsers?.length || 0
        },
        test2_sellers: {
          data: sellers,
          error: sellersError?.message,
          count: sellers?.length || 0
        },
        test3_roleCounts: roleCounts,
        test4_sellersCI: {
          data: sellersCI,
          error: sellersCIError?.message,
          count: sellersCI?.length || 0
        },
        test5_allFirst: {
          data: allFirst,
          error: allFirstError?.message,
          count: allFirst?.length || 0,
          roles: allFirst?.map(u => u.role)
        }
      })

    } catch (error: any) {
      console.error('❌ Test error:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-2 border-blue-500">
      <CardHeader>
        <CardTitle className="text-blue-600">🔍 Debug: Test Seller Query</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testQueries} disabled={loading} className="w-full">
          {loading ? 'Testing Queries...' : 'Run Seller Debug Test'}
        </Button>

        {result && (
          <div className="space-y-4 text-xs">
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold">Session Info:</h4>
                <p>User ID: {result.session?.userId}</p>
                <p>User Role: {result.session?.userRole}</p>
                <p>Has Session: {result.session?.hasSession ? 'Yes' : 'No'}</p>
              </div>

              <div>
                <h4 className="font-bold">Quick Summary:</h4>
                <p>All Users: {result.test1_allUsers?.count || 0}</p>
                <p>Sellers Found: {result.test2_sellers?.count || 0}</p>
                <p>Sellers (CI): {result.test4_sellersCI?.count || 0}</p>
              </div>
            </div>

            {result.test3_roleCounts && (
              <div>
                <h4 className="font-bold">Role Distribution:</h4>
                {Object.entries(result.test3_roleCounts).map(([role, count]) => (
                  <p key={role}>{role}: {count}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}