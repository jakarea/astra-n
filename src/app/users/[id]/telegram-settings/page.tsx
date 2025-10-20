'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, MessageCircle, Send, Loader2, Save, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface TelegramSettings {
  telegramChatId: string | null
  isConfigured: boolean
}

interface UserInfo {
  id: string
  name: string
  email: string
}

export default function UserTelegramSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [settings, setSettings] = useState<TelegramSettings | null>(null)
  const [tempChatId, setTempChatId] = useState('')

  useEffect(() => {
    if (!isAdmin()) {
      setHasError(true)
      setErrorMessage('Access denied. Admin role required.')
      setLoading(false)
      return
    }

    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Load user info and telegram settings in parallel
      const [userResponse, settingsResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          }
        }),
        fetch(`/api/admin/users/${userId}/telegram-settings`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          }
        })
      ])

      if (!userResponse.ok) {
        const errorData = await userResponse.json()
        throw new Error(errorData.error || `HTTP ${userResponse.status}`)
      }

      if (!settingsResponse.ok) {
        const errorData = await settingsResponse.json()
        throw new Error(errorData.error || `HTTP ${settingsResponse.status}`)
      }

      const userData = await userResponse.json()
      const settingsData = await settingsResponse.json()

      setUserInfo(userData.user)
      setSettings(settingsData.settings)
      setTempChatId(settingsData.settings.telegramChatId || '')
      setHasError(false)
    } catch (error: any) {
      setHasError(true)
      setErrorMessage(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    try {
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/users/${userId}/telegram-settings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          chatId: tempChatId.trim() || null,
          testConnection: false
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      // Update local state
      setSettings({
        telegramChatId: tempChatId.trim() || null,
        isConfigured: !!tempChatId.trim()
      })

      toast.success(result.message || 'Telegram settings saved successfully!')
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!tempChatId.trim()) {
      toast.error('Please enter a Telegram Chat ID first.')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: tempChatId.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Test message sent successfully! Check Telegram.')
      } else {
        toast.error(`Failed to send test message: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      toast.error('Failed to test Telegram connection. Please try again.')
    } finally {
      setTesting(false)
    }
  }

  const handleRemove = async () => {
    if (!userId) return

    setSaving(true)
    try {
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/users/${userId}/telegram-settings`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove settings')
      }

      // Update local state
      setSettings({
        telegramChatId: null,
        isConfigured: false
      })
      setTempChatId('')

      toast.success(result.message || 'Telegram settings removed successfully!')
    } catch (error: any) {
      toast.error(`Failed to remove settings: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (hasError) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push(`/users/${userId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Settings</h3>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push(`/users/${userId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to User
          </Button>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" onClick={() => router.push(`/users/${userId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to User
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Telegram Settings</h1>
          <p className="text-muted-foreground">
            Configure Telegram notifications for {userInfo?.name} ({userInfo?.email})
          </p>
        </div>
      </div>

      {/* Telegram Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
            <div className="flex gap-2">
              <Input
                id="telegram-chat-id"
                placeholder="e.g., 123456789 or -987654321"
                value={tempChatId}
                onChange={(e) => setTempChatId(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !tempChatId.trim()}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure Telegram bot notifications for new orders from webhooks
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm font-medium">
                Current Status: {settings?.isConfigured ? (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {settings?.telegramChatId ? `Chat ID: ${settings.telegramChatId}` : 'No Telegram notifications configured'}
              </p>
            </div>
            <div className="flex gap-2">
              {settings?.isConfigured && (
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Remove
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || tempChatId === (settings?.telegramChatId || '')}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}