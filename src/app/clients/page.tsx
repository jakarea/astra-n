"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Mail, Phone } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getSupabaseClient } from "@/lib/supabase"

export default function ClientsPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('User')

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const supabase = getSupabaseClient()
          const { data, error } = await supabase
            .from('users')
            .select('name, role')
            .eq('id', user.id)
            .single()

          if (!error && data) {
            setUserName(data.name || '')
            const capitalizedRole = data.role ?
              data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase() : 'User'
            setUserRole(capitalizedRole)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }

    fetchUserData()
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and contacts
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium text-foreground">
            {userName || user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-sm text-muted-foreground">{userRole}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              All registered clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Recent activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">
              Client retention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest client activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Clients module initialized</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
                <Badge variant="outline">System</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Page accessed</p>
                  <p className="text-xs text-muted-foreground">Few seconds ago</p>
                </div>
                <Badge variant="outline">User</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common client management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Add new client</p>
                  <p className="text-xs text-muted-foreground">Register new client profile</p>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Send emails</p>
                  <p className="text-xs text-muted-foreground">Client communication</p>
                </div>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Update contacts</p>
                  <p className="text-xs text-muted-foreground">Manage contact information</p>
                </div>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}