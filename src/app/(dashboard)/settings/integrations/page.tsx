"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/contexts/RoleContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Settings, CheckCircle, AlertCircle, Edit, Trash2, Copy, RefreshCw, ExternalLink, BarChart3 } from "lucide-react"
import Link from "next/link"
import { z } from 'zod'

// Types
type Integration = {
  id: number
  name: string
  type: string
  domain: string
  baseUrl?: string
  webhookSecret?: string
  adminAccessToken?: string
  isActive: boolean
  status: string
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name: string
    role: string
  }
}

// Validation schema
const integrationSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  type: z.enum(['shopify', 'woocommerce', 'wordpress'], {
    errorMap: () => ({ message: 'Please select a platform' })
  }),
  domain: z.string().min(1, 'Domain is required'),
  baseUrl: z.string().optional(),
  webhookSecret: z.string().optional(),
  adminAccessToken: z.string().optional()
})

type IntegrationFormData = z.infer<typeof integrationSchema>

export default function IntegrationsPage() {
  const { user, isAdmin } = useRole()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [newIntegration, setNewIntegration] = useState<Integration | null>(null)

  // Form states
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: '',
    type: 'shopify' as const,
    domain: '',
    baseUrl: '',
    webhookSecret: '',
    adminAccessToken: ''
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [submitting, setSubmitting] = useState(false)

  // Fetch integrations
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
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    // Validate form
    const result = integrationSchema.safeParse(formData)
    if (!result.success) {
      const errors: {[key: string]: string} = {}
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message
      })
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create integration')
      }

      const data = await response.json()
      setNewIntegration(data.integration)
      setIsAddModalOpen(false)
      setIsSuccessModalOpen(true)

      // Reset form
      setFormData({
        name: '',
        type: 'shopify' as const,
        domain: '',
        baseUrl: '',
        webhookSecret: '',
        adminAccessToken: ''
      })

      // Refresh list
      await fetchIntegrations()
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete integration
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/integrations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete integration')
      }

      await fetchIntegrations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration')
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
      console.log('Copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Generate webhook URL
  const getWebhookUrl = (integration: Integration) => {
    return `${window.location.origin}/api/webhook/orders?id=${integration.id}`
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Inactive
        </Badge>
      )
    }

    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings → Integrations</h1>
          <p className="text-muted-foreground">
            Aggiungi e gestisci gli store collegati (Shopify, WooCommerce, WordPress).
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" asChild>
            <Link href="/settings/integrations/dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Dashboard
            </Link>
          </Button>

          {/* Add New Integration Button */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Connect a New Store</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Store Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input
                  id="name"
                  placeholder="Acme IT"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="type">Platform</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shopify">Shopify</SelectItem>
                    <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.type && (
                  <p className="text-sm text-red-600">{formErrors.type}</p>
                )}
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Store Domain</Label>
                <Input
                  id="domain"
                  placeholder="mystore.myshopify.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Minuscolo: per WP/Woo il dominio del sito.
                </p>
                {formErrors.domain && (
                  <p className="text-sm text-red-600">{formErrors.domain}</p>
                )}
              </div>

              {/* Base URL (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL (opz.)</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://mystore.com"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                />
              </div>

              {/* Webhook Secret (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <Input
                  id="webhookSecret"
                  placeholder="shpss_xxx (Shopify) / secret Woo"
                  value={formData.webhookSecret}
                  onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                />
              </div>

              {/* Admin Access Token (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="adminAccessToken">Admin access token (opz.)</Label>
                <Input
                  id="adminAccessToken"
                  placeholder="shpat_xxx o key secret Woo"
                  value={formData.adminAccessToken}
                  onChange={(e) => setFormData({ ...formData, adminAccessToken: e.target.value })}
                />
              </div>

              {/* Submit Error */}
              {formErrors.submit && (
                <p className="text-sm text-red-600">{formErrors.submit}</p>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.name || !formData.domain}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Save Connection'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Connection Successful!
            </DialogTitle>
          </DialogHeader>
          {newIntegration && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your store has been connected successfully. Use the following credentials to configure webhooks:
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={getWebhookUrl(newIntegration)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getWebhookUrl(newIntegration))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {newIntegration.webhookSecret && (
                  <div className="space-y-2">
                    <Label>Webhook Secret</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={newIntegration.webhookSecret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(newIntegration.webhookSecret!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsSuccessModalOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Integrations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading integrations...
          </div>
        ) : error ? (
          <div className="col-span-full flex items-center justify-center h-32 text-red-600">
            <AlertCircle className="h-6 w-6 mr-2" />
            {error}
          </div>
        ) : integrations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No integrations yet</h3>
            <p className="text-muted-foreground mb-4">
              Connect your first store to start importing orders
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Integration
            </Button>
          </div>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{integration.domain}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" className="capitalize">
                      {integration.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(integration.status, integration.isActive)}
                </div>

                {integration.baseUrl && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base URL</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-mono">{integration.baseUrl}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(integration.baseUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Integration</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{integration.name}"? This action cannot be undone and will stop all data syncing from this store.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(integration.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}