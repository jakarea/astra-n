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
  Plus
} from 'lucide-react'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newLead: any) => void
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

export function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const leadData = {
        name: formData.name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        source: formData.source,
        logistic_status: formData.logistic_status || null,
        cod_status: formData.cod_status || null,
        kpi_status: formData.kpi_status || null,
        notes: formData.notes || null,
        user_id: session.user.id
      }

      console.log('[ADD_LEAD] Creating lead with data:', leadData)

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('crm_leads')
        .insert([leadData])
        .select()
        .single()

      console.log('[ADD_LEAD] Insert result:', { data, error })

      if (error) {
        console.error('[ADD_LEAD] Insert error:', error)
        throw new Error(error.message)
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: '',
        logistic_status: '',
        cod_status: '',
        kpi_status: '',
        notes: ''
      })

      // Pass the new lead data to parent
      onSuccess(data)
      onClose()
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Lead
          </DialogTitle>
          <DialogDescription>
            Create a new lead in your CRM system
          </DialogDescription>
        </DialogHeader>

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
            />
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
            <Button type="submit" disabled={loading || !formData.name || !formData.source}>
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}