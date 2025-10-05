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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading"
import {
  User,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  Edit
} from 'lucide-react'

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedLead: any) => void
  leadId: string | null
}

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

export function EditLeadModal({ isOpen, onClose, onSuccess, leadId }: EditLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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
    if (isOpen && leadId) {
      loadLead()
    }
  }, [isOpen, leadId])

  const loadLead = async () => {
    if (!leadId) return

    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const supabase = getAuthenticatedClient()

      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

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
    } catch (error) {      alert('Failed to load lead data')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadId) return

    setSaving(true)

    try {
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
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
      const { data, error } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Pass the updated lead data to parent
      onSuccess(data)
      onClose()
    } catch (error) {
      alert('Failed to update lead. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving && !loading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Lead
          </DialogTitle>
          <DialogDescription>
            Update lead information in your CRM system
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name *
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Lead name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-source" className="flex items-center gap-2">
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
                <Label htmlFor="edit-cod-status">COD Status</Label>
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
                <Label htmlFor="edit-logistic-status">Logistics Status</Label>
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
                <Label htmlFor="edit-kpi-status">KPI Status</Label>
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
              <Label htmlFor="edit-notes" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this lead..."
                rows={4}
                disabled={saving}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving || loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || loading || !formData.name || !formData.source}>
                {saving ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Lead
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