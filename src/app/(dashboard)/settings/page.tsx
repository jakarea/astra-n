"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/contexts/RoleContext"
import { telegramSettingsSchema, type TelegramSettingsFormData } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, Plus, Eye, Edit, Settings, Plug, CheckCircle, AlertCircle, Clock, Zap, RefreshCw, Link, MessageCircle, Bell, Save } from "lucide-react"

type Integration = {
  id: number
  name: string
  type: string
  domain: string
  webhook_secret: string
  admin_access_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const getStatusBadge = (status: string) => {
  const variants = {
    connected: { variant: "success" as const, label: "Connected", icon: CheckCircle },
    disconnected: { variant: "secondary" as const, label: "Disconnected", icon: Plug },
    error: { variant: "destructive" as const, label: "Error", icon: AlertCircle },
    pending: { variant: "warning" as const, label: "Configuring", icon: Clock }
  }

  const config = variants[status as keyof typeof variants]
  if (!config) return <Badge>{status}</Badge>

  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const getTypeBadge = (type: string) => {
  const variants = {
    "E-commerce Platform": "info",
    "Shipping Provider": "warning",
    "Payment Processor": "success",
    "Email Marketing": "secondary",
    "Marketplace": "destructive"
  }

  const variant = variants[type as keyof typeof variants] || "secondary"
  return <Badge variant={variant as any}>{type}</Badge>
}

export default function SettingsPage() {
  const { user, isAdmin } = useRole()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramNotifications, setTelegramNotifications] = useState(true)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramErrors, setTelegramErrors] = useState<{[key: string]: string}>({})

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations')
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }
      const data = await response.json()
      setIntegrations(data.integrations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
    // Load existing Telegram settings from localStorage
    const savedChatId = localStorage.getItem(`telegram_chat_id_${user?.email}`)
    const savedNotifications = localStorage.getItem(`telegram_notifications_${user?.email}`)

    if (savedChatId) {
      setTelegramChatId(savedChatId)
    }
    if (savedNotifications !== null) {
      setTelegramNotifications(savedNotifications === 'true')
    }
  }, [user])

  const saveTelegramSettings = async () => {
    if (!user) return

    setTelegramErrors({})

    // Validate with Zod
    const result = telegramSettingsSchema.safeParse({
      chatId: telegramChatId,
      notificationsEnabled: telegramNotifications
    })

    if (!result.success) {
      const errors: {[key: string]: string} = {}
      result.error.errors.forEach((error) => {
        errors[error.path[0] as string] = error.message
      })
      setTelegramErrors(errors)
      return
    }

    setSavingTelegram(true)
    try {
      const validatedData = result.data
      // Save to localStorage for prototype
      localStorage.setItem(`telegram_chat_id_${user.email}`, validatedData.chatId)
      localStorage.setItem(`telegram_notifications_${user.email}`, validatedData.notificationsEnabled.toString())

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Show success (you could add a toast notification here)
      console.log('Telegram settings saved successfully')
    } catch (err) {
      console.error('Failed to save Telegram settings:', err)
    } finally {
      setSavingTelegram(false)
    }
  }

  const testTelegramNotification = async () => {
    if (!telegramChatId.trim()) return

    setTestingTelegram(true)
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId: telegramChatId }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Test notification sent successfully')
        // You could show a success toast here
      } else {
        console.error('Failed to send test notification:', result.error)
        // You could show an error toast here
      }
    } catch (err) {
      console.error('Error testing Telegram notification:', err)
    } finally {
      setTestingTelegram(false)
    }
  }

  const connectedIntegrations = integrations.filter(i => i.is_active).length
  const errorIntegrations = 0 // We'll implement error tracking later
  const totalSynced = 0 // We'll implement sync tracking later
  const totalErrors = 0 // We'll implement error tracking later

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Integrations</h1>
            <p className="text-muted-foreground">Configure and monitor external integrations</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizza Tutto
            </Button>
            <Button asChild>
              <Link href="/settings/integrations">
                <Plus className="h-4 w-4 mr-2" />
                Gestisci Integrazioni
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Integrazioni Totali</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{integrations.length}</div>
              <p className="text-xs text-muted-foreground">Sistemi configurati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connesse</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedIntegrations}</div>
              <p className="text-xs text-muted-foreground">Funzionanti</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Errori</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errorIntegrations}</div>
              <p className="text-xs text-muted-foreground">Da verificare</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dati Sincronizzati</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSynced.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Record elaborati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errori Totali</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalErrors}</div>
              <p className="text-xs text-muted-foreground">Da risolvere</p>
            </CardContent>
          </Card>
        </div>

        {/* Telegram Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Notifiche Telegram
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configura le notifiche Telegram per ricevere avvisi sui nuovi lead
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Telegram Bot Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Come configurare le notifiche Telegram</h4>
                  <ol className="mt-2 text-sm text-blue-800 space-y-1">
                    <li>1. Apri Telegram e cerca il bot "@AstraNotificationBot"</li>
                    <li>2. Avvia una conversazione con il bot scrivendo /start</li>
                    <li>3. Il bot ti fornirà il tuo Chat ID</li>
                    <li>4. Inserisci il Chat ID nel campo sottostante</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id">Chat ID Telegram</Label>
                  <Input
                    id="telegram-chat-id"
                    type="text"
                    placeholder="es. 123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Il tuo ID chat personale di Telegram
                  </p>
                  {telegramErrors.chatId && (
                    <p className="text-sm text-red-600">{telegramErrors.chatId}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="telegram-notifications"
                    checked={telegramNotifications}
                    onChange={(e) => setTelegramNotifications(e.target.checked)}
                    className="h-4 w-4 rounded"
                    style={{accentColor: '#3ECF8E'}}
                  />
                  <Label htmlFor="telegram-notifications">
                    Abilita notifiche per nuovi lead
                  </Label>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={saveTelegramSettings}
                    disabled={savingTelegram || !telegramChatId.trim()}
                    className="w-full"
                    style={{
                      backgroundColor: savingTelegram ? '#94A3B8' : '#3ECF8E',
                      color: '#FFFFFF'
                    }}
                  >
                    {savingTelegram ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salva Impostazioni
                      </>
                    )}
                  </Button>

                  {telegramChatId && (
                    <Button
                      variant="outline"
                      onClick={testTelegramNotification}
                      disabled={testingTelegram || !telegramChatId.trim()}
                      className="w-full"
                    >
                      {testingTelegram ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Inviando test...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Invia Notifica di Test
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Stato Notifiche</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Chat ID configurato:</span>
                      <Badge variant={telegramChatId ? "success" : "secondary"}>
                        {telegramChatId ? 'Sì' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Notifiche attive:</span>
                      <Badge variant={telegramNotifications ? "success" : "secondary"}>
                        {telegramNotifications ? 'Attive' : 'Disattivate'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {telegramChatId && telegramNotifications && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Notifiche Telegram configurate correttamente
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Elenco Integrazioni</CardTitle>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cerca integrazioni..." className="pl-10 w-80" />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integrazione</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ultima Sync</TableHead>
                  <TableHead>Frequenza</TableHead>
                  <TableHead>Dati Sync</TableHead>
                  <TableHead>Errori</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Caricamento integrazioni...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex items-center justify-center text-red-600">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : integrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex items-center justify-center text-muted-foreground">
                        <Plug className="mr-2 h-4 w-4" />
                        Nessuna integrazione configurata
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  integrations.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{integration.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Tipo: {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(integration.type)}</TableCell>
                      <TableCell>{getStatusBadge(integration.is_active ? "connected" : "disconnected")}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-mono text-xs">{new Date(integration.updated_at).toLocaleString('it-IT')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">Automatica</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">-</div>
                          <div className="text-xs text-muted-foreground">In sviluppo</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium text-green-600">0</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-xs">
                          <Link className="h-3 w-3 mr-1" />
                          <span className="font-mono truncate max-w-[150px]">{integration.domain}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Webhook Secret: {integration.webhook_secret.substring(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchIntegrations}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}