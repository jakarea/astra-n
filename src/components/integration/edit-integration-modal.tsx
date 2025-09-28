"use client"

import { useState, useEffect } from 'react'
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
  Edit
} from 'lucide-react'

interface EditIntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedIntegration: any) => void
  integrationId: string | null
}

interface FormData {
  name: string
  type: string
  domain: string
  baseUrl: string
  adminAccessToken: string
  status: string
}

const SHOP_TYPES = [
  { value: 'shopify', label: 'Shopify', actions: ['order:created', 'order:updated', 'order:deleted', 'order:shipped'] },
  { value: 'woocommerce', label: 'WooCommerce', actions: ['order:created', 'order:updated', 'order:cancelled', 'order:completed'] },
  { value: 'wordpress', label: 'WordPress', actions: ['order:created', 'order:updated', 'order:deleted'] },
  { value: 'custom', label: 'Custom API', actions: ['webhook:received', 'data:sync'] }
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' }
]

export function EditIntegrationModal({ isOpen, onClose, onSuccess, integrationId }: EditIntegrationModalProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    domain: '',
    baseUrl: '',
    adminAccessToken: '',
    status: 'active'
  })

  const [supportedActions, setSupportedActions] = useState<string[]>([])

  // Load integration data
  useEffect(() => {
    const loadIntegration = async () => {
      if (!integrationId || !isOpen) return

      setLoadingData(true)
      try {
        const session = getSession()
        if (!session) {
          throw new Error('User not authenticated')
        }

        const supabase = getAuthenticatedClient()

        // Convert integrationId to number since DB expects integer
        const integrationIdNum = parseInt(integrationId, 10)
        if (isNaN(integrationIdNum)) {
          throw new Error(`Invalid integration ID: ${integrationId}`)
        }

        const { data, error } = await supabase
          .from('integrations')
          .select('*')
          .eq('id', integrationIdNum)
          .eq('user_id', session.user.id)

        if (error) {
          throw new Error(`Database error: ${error.message}`)
        }

        if (!data || data.length === 0) {
          throw new Error('Integration not found or access denied')
        }

        const integration = data[0]

        setFormData({
          name: integration.name || '',
          type: integration.type || '',
          domain: integration.domain || '',
          baseUrl: integration.base_url || '',
          adminAccessToken: integration.admin_access_token || '',
          status: integration.status || 'active'
        })

        // Set supported actions based on type
        const shopType = SHOP_TYPES.find(t => t.value === integration.type)
        setSupportedActions(shopType?.actions || [])
      } catch (error) {
        alert(`Failed to load integration data. Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        onClose()
      } finally {
        setLoadingData(false)
      }
    }

    loadIntegration()
  }, [integrationId, isOpen, onClose])

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

      const integrationData = {
        name: formData.name,
        type: formData.type,
        domain: formData.domain,
        base_url: formData.baseUrl || null,
        admin_access_token: formData.adminAccessToken || null,
        status: formData.status,
        is_active: formData.status === 'active',
        updated_at: new Date().toISOString()
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('integrations')
        .update(integrationData)
        .eq('id', integrationId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Pass the updated integration data to parent
      onSuccess(data)
      onClose()
    } catch (_error) {
      alert('Failed to update integration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading && !loadingData) {
      onClose()
    }
  }

  const getDeliveryUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

    // Generate dynamic URL based on shop type and first supported action
    if (formData.type && supportedActions.length > 0) {
      const primaryAction = supportedActions[0] // Use first action as primary
      const actionType = primaryAction.split(':')[0] // Extract action type (order, webhook, data)
      return `${baseUrl}/api/webhook/${formData.type}-${actionType}-integration`
    }

    // Fallback to generic URL
    return `${baseUrl}/api/webhook/integration`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Integration
          </DialogTitle>
          <DialogDescription>
            Update integration settings
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-6 flex items-center justify-center">
            <LoadingSpinner className="mr-2" />
            Loading integration data...
          </div>
        ) : (
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin Access Token */}
            <div className="space-y-2">
              <Label htmlFor="adminAccessToken">Admin Access Token</Label>
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

            {/* Supported Actions */}
            {supportedActions.length > 0 && (
              <div className="space-y-2">
                <Label>Supported Action Types</Label>
                <div className="flex flex-wrap gap-2">
                  {supportedActions.map((action) => (
                    <span key={action} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {action}
                    </span>
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
                  Configure this URL in your webshop&apos;s webhook settings.
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Integration
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}