"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading'
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Globe,
  MessageSquare
} from 'lucide-react'

interface FormData {
  name: string
  email: string
  phone: string
  source: string
  logistic_status: string
  cod_status: string
  kpi_status: string
  notes: string
}

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' }
]

const COD_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' }
]

const LOGISTIC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
]

const KPI_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
]

export default function EditLeadPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lead, setLead] = useState<unknown>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    source: '',
    logistic_status: '',
    cod_status: '',
    kpi_status: '',
    notes: ''
  })

  useEffect(() => {
    loadLead()
  }, [leadId])

  const loadLead = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const supabase = getAuthenticatedClient()

      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          order:orders(
            id,
            external_order_id,
            total_amount
          )
        `)
        .eq('id', leadId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setLead(data)
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        source: data.source || '',
        logistic_status: data.logistic_status || '',
        cod_status: data.cod_status || '',
        kpi_status: data.kpi_status || '',
        notes: data.notes || ''
      })
    } catch (error) {
      console.error('Error loading lead:', error)
      alert('Failed to load lead data')
      router.push('/crm')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const supabase = getAuthenticatedClient()

      const updateData = {
        name: formData.name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        source: formData.source,
        logistic_status: formData.logistic_status || null,
        cod_status: formData.cod_status || null,
        kpi_status: formData.kpi_status || null,
        notes: formData.notes || null
      }

      const { error } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', session.user.id)

      if (error) {
        throw new Error(error.message)
      }

      router.push(`/crm/${leadId}`)
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found</p>
        <Button asChild className="mt-4">
          <Link href="/crm">Back to CRM</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/crm/${lead.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lead
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Lead</h1>
          <p className="text-muted-foreground">Lead ID: {lead.id}</p>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Lead name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Source *
                </Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}
                  required
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cod_status">COD Status</Label>
                <Select
                  value={formData.cod_status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cod_status: value }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select COD status" />
                  </SelectTrigger>
                  <SelectContent>
                    {COD_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logistic_status">Logistics Status</Label>
                <Select
                  value={formData.logistic_status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, logistic_status: value }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select logistics status" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOGISTIC_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi_status">KPI Status</Label>
                <Select
                  value={formData.kpi_status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, kpi_status: value }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select KPI status" />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this lead..."
                rows={4}
                disabled={saving}
              />
            </div>

            {/* Order Information (Read-only) */}
            {lead.order && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-medium mb-2">Associated Order (Read-only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="ml-2 font-mono">{lead.order.external_order_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-2 font-medium">€{Number(lead.order.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving || !formData.name || !formData.source}>
                {saving ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button variant="outline" asChild disabled={saving}>
                <Link href={`/crm/${lead.id}`}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}