"use client"

import { useState } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading"
import {
  Store,
  Globe,
  Link,
  Plus
} from 'lucide-react'

interface AddIntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newIntegration: any) => void
}

interface FormData {
  name: string
  type: string
  domain: string
  baseUrl: string
  adminAccessToken: string
  notes: string
}

const SHOP_TYPES = [
  { value: 'shopify', label: 'Shopify', actions: ['order:created', 'order:updated', 'order:deleted', 'order:shipped'] },
  { value: 'woocommerce', label: 'WooCommerce', actions: ['order:created', 'order:updated', 'order:cancelled', 'order:completed'] },
  { value: 'wordpress', label: 'WordPress', actions: ['order:created', 'order:updated', 'order:deleted'] },
  { value: 'custom', label: 'Custom API', actions: ['webhook:received', 'data:sync'] }
]

export function AddIntegrationModal({ isOpen, onClose, onSuccess }: AddIntegrationModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    domain: '',
    baseUrl: '',
    adminAccessToken: '',
    notes: ''
  })

  const [supportedActions, setSupportedActions] = useState<string[]>([])

  const handleShopTypeChange = (type: string) => {
    setFormData(prev => ({ ...prev, type }))
    const shopType = SHOP_TYPES.find(t => t.value === type)
    setSupportedActions(shopType?.actions || [])
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Get user's webhook secret from database
      const supabase = getAuthenticatedClient()

      const { data: userData } = await supabase
        .from('users')
        .select('webhook_secret')
        .eq('id', session.user.id)
        .single()

      let userWebhookSecret = userData?.webhook_secret

      // If user doesn't have webhook secret, generate one using the API
      if (!userWebhookSecret) {
        console.log('[ADD_INTEGRATION] User has no webhook secret, generating one...')

        const response = await fetch('/api/user/regenerate-webhook-secret', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('[ADD_INTEGRATION] Webhook secret API error:', errorData)
          throw new Error(`Failed to generate webhook secret: ${errorData.message || 'API request failed'}`)
        }

        const result = await response.json()
        userWebhookSecret = result.webhookSecret
        console.log('[ADD_INTEGRATION] Webhook secret generated successfully')
      }

      const integrationData = {
        name: formData.name,
        type: formData.type,
        domain: formData.domain,
        base_url: formData.baseUrl || null,
        admin_access_token: formData.adminAccessToken || null,
        webhook_secret: userWebhookSecret,
        user_id: session.user.id,
        status: 'active',
        is_active: true
      }

      console.log('[ADD_INTEGRATION] Creating integration with data:', integrationData)

      const { data, error } = await supabase
        .from('integrations')
        .insert([integrationData])
        .select()
        .single()

      console.log('[ADD_INTEGRATION] Insert result:', { data, error })

      if (error) {
        console.error('[ADD_INTEGRATION] Insert error:', error)
        throw new Error(error.message)
      }

      // Reset form
      setFormData({
        name: '',
        type: '',
        domain: '',
        baseUrl: '',
        adminAccessToken: '',
        notes: ''
      })
      setSupportedActions([])

      // Pass the new integration data to parent
      onSuccess(data)
      onClose()
    } catch (error) {
      console.error('Error creating integration:', error)
      alert('Failed to create integration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const getDeliveryUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

    // Generate dynamic URL based on shop type and first supported action
    if (formData.type && supportedActions.length > 0) {
      const primaryAction = supportedActions[0] // Use first action as primary
      const actionType = primaryAction.split(':')[0] // Extract action type (order, webhook, data)
      return `${baseUrl}/api/webhooks/${formData.type}-${actionType}-integration`
    }

    // Fallback to generic URL
    return `${baseUrl}/api/webhooks/integration`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Integration
          </DialogTitle>
          <DialogDescription>
            Connect a new webshop to your system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Webshop Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Awesome Store"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Shop Type *
              </Label>
              <Select
                value={formData.type}
                onValueChange={handleShopTypeChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shop type" />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain *
              </Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="mystore.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Base URL
              </Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://mystore.com"
              />
            </div>
          </div>

          {/* API Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminAccessToken" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Admin Access Token
              </Label>
              <Input
                id="adminAccessToken"
                type="password"
                value={formData.adminAccessToken}
                onChange={(e) => setFormData(prev => ({ ...prev, adminAccessToken: e.target.value }))}
                placeholder="Your API access token (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Used for API calls to your webshop. Leave empty if not required.
              </p>
            </div>
          </div>

          {/* Supported Actions */}
          {supportedActions.length > 0 && (
            <div className="space-y-2">
              <Label>Supported Action Types</Label>
              <div className="flex flex-wrap gap-2">
                {supportedActions.map((action) => (
                  <Badge key={action} variant="secondary">
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Webhook Configuration */}
          <div className="space-y-2">
            <Label>Webhook Configuration</Label>
            <div className="bg-muted p-4 rounded-lg space-y-3 border">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Webhook Delivery URL:</Label>
                <div className="font-mono text-sm bg-card p-3 rounded-md border shadow-sm">
                  {getDeliveryUrl()}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure this URL in your webshop&apos;s webhook settings. The webhook secret will be automatically generated after creating the integration.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.type || !formData.domain}>
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Integration
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}