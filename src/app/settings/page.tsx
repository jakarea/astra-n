"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, User, Shield, Bell, Palette, Monitor, Moon, Sun } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('User')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [autoSave, setAutoSave] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const supabase = getSupabaseClient()

          // Fetch user data
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

          // Fetch user settings
          const { data: settingsData, error: settingsError } = await supabase
            .from('user_settings')
            .select('notifications_enabled, email_notifications, dark_mode, auto_save')
            .eq('user_id', user.id)
            .single()

          if (!settingsError && settingsData) {
            setNotificationsEnabled(settingsData.notifications_enabled ?? true)
            setEmailNotifications(settingsData.email_notifications ?? true)
            setDarkMode(settingsData.dark_mode ?? false)
            setAutoSave(settingsData.auto_save ?? true)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }

    fetchUserData()
  }, [user?.id])

  const handleSaveSettings = async () => {
    if (!user?.id) return

    try {
      const supabase = getSupabaseClient()

      // Upsert user settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notifications_enabled: notificationsEnabled,
          email_notifications: emailNotifications,
          dark_mode: darkMode,
          auto_save: autoSave,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
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
            <CardTitle className="text-sm font-medium">Profile Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Account status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Secure</div>
            <p className="text-xs text-muted-foreground">
              Security status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Enabled</div>
            <p className="text-xs text-muted-foreground">
              Alert preferences
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preferences</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Default</div>
            <p className="text-xs text-muted-foreground">
              System preferences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Push Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive push notifications for important updates
              </div>
            </div>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              {notificationsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive email notifications for new orders and updates
              </div>
            </div>
            <Button
              variant={emailNotifications ? "default" : "outline"}
              size="sm"
              onClick={() => setEmailNotifications(!emailNotifications)}
            >
              {emailNotifications ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Dark Mode</div>
              <div className="text-sm text-muted-foreground">
                Toggle between light and dark themes
              </div>
            </div>
            <Button
              variant={darkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "Dark" : "Light"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Preferences
          </CardTitle>
          <CardDescription>
            Configure system behavior and performance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Auto-save</div>
              <div className="text-sm text-muted-foreground">
                Automatically save changes as you work
              </div>
            </div>
            <Button
              variant={autoSave ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoSave(!autoSave)}
            >
              {autoSave ? "Enabled" : "Disabled"}
            </Button>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSaveSettings}>
              Save All Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest settings activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Settings preferences loaded</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
                <Badge variant="outline">System</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">General settings updated</p>
                  <p className="text-xs text-muted-foreground">Ready to save</p>
                </div>
                <Badge variant="outline">Settings</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common settings management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Update profile</p>
                  <p className="text-xs text-muted-foreground">Modify account information</p>
                </div>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Security settings</p>
                  <p className="text-xs text-muted-foreground">Manage password and 2FA</p>
                </div>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notification preferences</p>
                  <p className="text-xs text-muted-foreground">Configure alert settings</p>
                </div>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}