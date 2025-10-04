'use client'

import { useState } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SellerDebug() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testQuery = async () => {
    try {
      setLoading(true)
      const session = getSession()
      console.log('Session:', session)

      if (!session) {
        setResult({ error: 'No session found' })
        return
      }

      const supabase = getAuthenticatedClient()

      // Test 1: Get all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, name, email, role')

      // Test 2: Get sellers specifically
      const { data: sellers, error: sellersError } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'seller')

      // Test 3: Count by role
      const { data: roleCounts, error: roleCountsError } = await supabase
        .from('users')
        .select('role')

      const counts = roleCounts?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setResult({
        session: {
          userId: session.user.id,
          userRole: session.user.role,
        },
        allUsers: {
          data: allUsers,
          error: allUsersError,
          count: allUsers?.length || 0
        },
        sellers: {
          data: sellers,
          error: sellersError,
          count: sellers?.length || 0
        },
        roleCounts: counts
      })

    } catch (error) {
      console.error('Debug error:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>🔍 Seller Debug Tool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testQuery} disabled={loading}>
          {loading ? 'Testing...' : 'Test Seller Query'}
        </Button>

        {result && (
          <div className="space-y-4">
            {result.error ? (
              <div className="text-red-500">Error: {result.error}</div>
            ) : (
              <>
                <div>
                  <h4 className="font-medium">Session Info:</h4>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify(result.session, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium">All Users ({result.allUsers.count}):</h4>
                  {result.allUsers.error ? (
                    <div className="text-red-500">Error: {result.allUsers.error.message}</div>
                  ) : (
                    <div className="space-y-2">
                      {result.allUsers.data?.map((user: any) => (
                        <div key={user.id} className="flex items-center gap-2">
                          <span>{user.name}</span>
                          <Badge variant="outline">{user.role}</Badge>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium">Sellers Only ({result.sellers.count}):</h4>
                  {result.sellers.error ? (
                    <div className="text-red-500">Error: {result.sellers.error.message}</div>
                  ) : result.sellers.count === 0 ? (
                    <div className="text-yellow-600">No sellers found!</div>
                  ) : (
                    <div className="space-y-2">
                      {result.sellers.data?.map((seller: any) => (
                        <div key={seller.id} className="flex items-center gap-2">
                          <span>{seller.name}</span>
                          <Badge>{seller.role}</Badge>
                          <span className="text-xs text-muted-foreground">{seller.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium">Role Counts:</h4>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify(result.roleCounts, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}