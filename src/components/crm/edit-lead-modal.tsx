"use client"

import { useState, useEffect } from 'react'
import { useRole } from '@/contexts/RoleContext'
import { updateCrmLeadSchema, type UpdateCrmLeadFormData } from '@/lib/validations'
import { LoadingSpinner } from '@/components/ui/loading'
import { handleError } from '@/lib/error-handling'
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
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  User,
  Mail,
  Phone,
  Tag,
  Globe,
  MessageSquare,
  AlertCircle,
  X,
  Plus,
  Check,
  ChevronsUpDown,
  Edit
} from 'lucide-react'

interface CrmLead {
  id: number
  name: string
  email: string | null
  phone: string | null
  source: string
  logistic_status: string
  cod_status: string
  kpi_status: string
  notes: string | null
  created_at: string
  updated_at: string
  tags?: Array<{
    tag: {
      id: number
      name: string
      color: string
    }
  }>
}

interface CrmTag {
  id: number
  name: string
  color: string
}

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (lead: CrmLead) => void
  lead: CrmLead | null
}

const sourceOptions = [
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'social_media', label: 'Social Media', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'referral', label: 'Referral', icon: User },
  { value: 'advertisement', label: 'Advertisement', icon: Globe },
  { value: 'trade_show', label: 'Trade Show', icon: Globe },
  { value: 'manual', label: 'Manual Entry', icon: User },
  { value: 'other', label: 'Other', icon: Globe }
]

const logisticStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'shipped', label: 'Shipped', color: 'purple' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
]

const codStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
]

const kpiStatusOptions = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'purple' },
  { value: 'qualified', label: 'Qualified', color: 'yellow' },
  { value: 'proposal', label: 'Proposal', color: 'orange' },
  { value: 'negotiation', label: 'Negotiation', color: 'pink' },
  { value: 'won', label: 'Won', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' }
]

export function EditLeadModal({ isOpen, onClose, onSuccess, lead }: EditLeadModalProps) {
  const { user } = useRole()
  const [loading, setLoading] = useState(false)
  const [availableTags, setAvailableTags] = useState<CrmTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const [formData, setFormData] = useState<UpdateCrmLeadFormData>({
    name: '',
    email: '',
    phone: '',
    source: 'website',
    logisticStatus: 'pending',
    codStatus: 'pending',
    kpiStatus: 'new',
    tags: [],
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when lead changes
  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source,
        logisticStatus: lead.logistic_status,
        codStatus: lead.cod_status,
        kpiStatus: lead.kpi_status,
        notes: lead.notes || ''
      })

      // Set selected tags
      const tagNames = lead.tags?.map(tagRelation => tagRelation.tag.name) || []
      setSelectedTags(tagNames)
    }
  }, [lead, isOpen])

  // Load available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch('/api/crm/tags')
        const result = await response.json()

        if (result.success) {
          setAvailableTags(result.data)
        }
      } catch (error) {
        console.error('Failed to load tags:', error)
      }
    }

    if (isOpen) {
      loadTags()
    }
  }, [isOpen])

  const handleInputChange = (field: keyof UpdateCrmLeadFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(name => name !== tagName)
        : [...prev, tagName]
    )
  }

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return

    try {
      const response = await fetch('/api/crm/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim().toLowerCase(),
          color: '#14b8a6'
        })
      })

      const result = await response.json()

      if (result.success) {
        setAvailableTags(prev => [...prev, result.data])
        setSelectedTags(prev => [...prev, result.data.name])
        setNewTagName('')
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lead) return

    try {
      setLoading(true)
      setErrors({})

      const submitData = {
        ...formData,
        tags: selectedTags
      }

      // Validate form data
      const result = updateCrmLeadSchema.safeParse(submitData)

      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        if (result.error?.errors) {
          result.error.errors.forEach((error) => {
            const fieldName = error.path?.[0] as string
            if (fieldName) {
              fieldErrors[fieldName] = error.message
            } else {
              fieldErrors.general = error.message
            }
          })
        } else {
          fieldErrors.general = 'Please check the form for errors'
        }
        setErrors(fieldErrors)
        setLoading(false)
        return
      }

      // Submit to API
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo-user'
        },
        body: JSON.stringify(result.data)
      })

      const apiResult = await response.json()

      if (!apiResult.success) {
        const errorMessage = typeof apiResult.error === 'string'
          ? apiResult.error
          : apiResult.error?.message || 'Error updating lead. Please try again.'
        setErrors({ general: errorMessage })
        setLoading(false)
        return
      }

      // Success
      onSuccess(apiResult.data)
      handleClose()

    } catch (error) {
      const appError = handleError(error)
      const errorMessage = typeof appError === 'string'
        ? appError
        : appError?.message || 'An unexpected error occurred'
      setErrors({ general: errorMessage })
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      source: 'website',
      logisticStatus: 'pending',
      codStatus: 'pending',
      kpiStatus: 'new',
      tags: [],
      notes: ''
    })
    setSelectedTags([])
    setErrors({})
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-6 w-6 text-primary" />
            Edit Lead
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update lead information and track changes in the CRM system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive-foreground">{errors.general}</span>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Full name of the lead"
                    disabled={loading}
                    className={`pl-10 ${errors.name ? 'border-destructive focus:border-destructive' : ''}`}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-medium text-foreground">
                  Source <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => handleInputChange('source', value)}
                  disabled={loading}
                >
                  <SelectTrigger className={errors.source ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.source && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.source}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    disabled={loading}
                    className={`pl-10 ${errors.email ? 'border-destructive focus:border-destructive' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+39 123 456 7890"
                    disabled={loading}
                    className={`pl-10 ${errors.phone ? 'border-destructive focus:border-destructive' : ''}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Lead Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logistic Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Logistic Status</Label>
                <Select
                  value={formData.logisticStatus || 'pending'}
                  onValueChange={(value) => handleInputChange('logisticStatus', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {logisticStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* COD Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">COD Status</Label>
                <Select
                  value={formData.codStatus || 'pending'}
                  onValueChange={(value) => handleInputChange('codStatus', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {codStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* KPI Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">KPI Status</Label>
                <Select
                  value={formData.kpiStatus || 'new'}
                  onValueChange={(value) => handleInputChange('kpiStatus', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kpiStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Tags
            </h3>

            <div className="space-y-2">
              <Popover open={tagInputOpen} onOpenChange={setTagInputOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tagInputOpen}
                    className="w-full justify-between"
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Select tags...
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search tags..."
                      value={newTagName}
                      onValueChange={setNewTagName}
                    />
                    <CommandEmpty>
                      <div className="flex items-center justify-center p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCreateNewTag}
                          disabled={!newTagName.trim()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create "{newTagName}"
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onSelect={() => handleTagToggle(tag.name)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedTags.includes(tag.name) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <Badge
                            variant="outline"
                            className="text-xs mr-2"
                            style={{
                              backgroundColor: tag.color + '20',
                              borderColor: tag.color
                            }}
                          >
                            {tag.name}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTags.map((tagName) => {
                    const tag = availableTags.find(t => t.name === tagName)
                    return (
                      <Badge
                        key={tagName}
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                        style={{
                          backgroundColor: tag?.color ? tag.color + '20' : undefined,
                          borderColor: tag?.color
                        }}
                      >
                        {tagName}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleTagToggle(tagName)}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Notes
            </h3>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-foreground">Additional notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter additional notes about the lead..."
                rows={4}
                disabled={loading}
                className={`resize-none ${errors.notes ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.notes && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.notes}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="min-w-24"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 min-w-32 bg-primary hover:bg-primary/90"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Updating...' : 'Update Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}