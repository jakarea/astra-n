"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, User, Shield, Bell, MessageCircle, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getSupabaseClient } from "@/lib/supabase"

export default function SettingsPage() {
  const { user } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('User')
  const [telegramChatId, setTelegramChatId] = useState<string>('')
  const [tempTelegramChatId, setTempTelegramChatId] = useState<string>('')
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramTesting, setTelegramTesting] = useState(false)

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

          // Fetch user settings (including Telegram chat ID)
          const { data: settingsData, error: settingsError } = await supabase
            .from('user_settings')
            .select('telegram_chat_id')
            .eq('user_id', user.id)
            .single()

          if (!settingsError && settingsData) {
            setTelegramChatId(settingsData.telegram_chat_id || '')
            setTempTelegramChatId(settingsData.telegram_chat_id || '')
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }

    fetchUserData()
  }, [user?.id])

  const handleSaveTelegram = async () => {
    if (!user?.id) return

    setTelegramLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Upsert user settings
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          telegram_chat_id: tempTelegramChatId || null,
          updated_at: new Date().toISOString()
        })

        
      if (error) {
        throw error
      }

      setTelegramChatId(tempTelegramChatId)
      alert('Telegram settings saved successfully!')
    } catch (error) {
      console.error('Error saving Telegram settings:', error)
      alert('Failed to save Telegram settings. Please try again.')
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleTestTelegram = async () => {
    if (!tempTelegramChatId.trim()) {
      alert('Please enter your Telegram Chat ID first.')
      return
    }

    setTelegramTesting(true)
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: tempTelegramChatId.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert('Test message sent successfully! Check your Telegram.')
      } else {
        alert(`Failed to send test message: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error testing Telegram:', error)
      alert('Failed to test Telegram connection. Please try again.')
    } finally {
      setTelegramTesting(false)
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

      {/* Telegram Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Notifications
          </CardTitle>
          <CardDescription>
            Configure Telegram bot notifications for new orders from webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
            <div className="flex gap-2">
              <Input
                id="telegram-chat-id"
                placeholder="e.g., 123456789 or -987654321"
                value={tempTelegramChatId}
                onChange={(e) => setTempTelegramChatId(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestTelegram}
                disabled={telegramTesting || !tempTelegramChatId.trim()}
              >
                {telegramTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              To get your Chat ID: Message @userinfobot on Telegram, or start a chat with your bot and use @get_id_bot
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm font-medium">
                Current Status: {telegramChatId ? (
                  <Badge variant="default">Configured</Badge>
                ) : (
                  <Badge variant="outline">Not Configured</Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {telegramChatId ? `Chat ID: ${telegramChatId}` : 'No Telegram notifications configured'}
              </p>
            </div>
            <Button
              onClick={handleSaveTelegram}
              disabled={telegramLoading || tempTelegramChatId === telegramChatId}
            >
              {telegramLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Settings
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
                  <p className="text-sm font-medium">Settings module initialized</p>
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