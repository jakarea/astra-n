"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  Tag,
  MessageSquare,
  Edit,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  TrendingUp
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
  events?: Array<{
    id: number
    type: string
    details: any
    created_at: string
  }>
  tags?: Array<{
    tag: {
      id: number
      name: string
      color: string
    }
  }>
}

interface ViewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (lead: CrmLead) => void
  leadId: number | null
}

const getStatusConfig = (status: string, type: 'cod' | 'logistic' | 'kpi') => {
  const configs = {
    cod: {
      pending: { color: 'orange', icon: Clock, label: 'Pending' },
      confirmed: { color: 'green', icon: CheckCircle, label: 'Confirmed' },
      rejected: { color: 'red', icon: X, label: 'Rejected' }
    },
    logistic: {
      pending: { color: 'orange', icon: Clock, label: 'Pending' },
      processing: { color: 'blue', icon: Package, label: 'Processing' },
      shipped: { color: 'purple', icon: Package, label: 'Shipped' },
      delivered: { color: 'green', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'red', icon: X, label: 'Cancelled' }
    },
    kpi: {
      new: { color: 'blue', icon: User, label: 'New' },
      contacted: { color: 'purple', icon: MessageSquare, label: 'Contacted' },
      qualified: { color: 'yellow', icon: CheckCircle, label: 'Qualified' },
      proposal: { color: 'orange', icon: MessageSquare, label: 'Proposal' },
      negotiation: { color: 'pink', icon: TrendingUp, label: 'Negotiation' },
      won: { color: 'green', icon: CheckCircle, label: 'Won' },
      lost: { color: 'red', icon: X, label: 'Lost' }
    }
  }

  return configs[type][status as keyof typeof configs[typeof type]] || {
    color: 'gray',
    icon: AlertCircle,
    label: status
  }
}

const sourceLabels: Record<string, string> = {
  website: 'Website',
  social_media: 'Social Media',
  email: 'Email',
  phone: 'Phone',
  referral: 'Referral',
  advertisement: 'Advertisement',
  trade_show: 'Trade Show',
  manual: 'Manual Entry',
  other: 'Other'
}

export function ViewLeadModal({ isOpen, onClose, onEdit, leadId }: ViewLeadModalProps) {
  const [lead, setLead] = useState<CrmLead | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && leadId) {
      loadLead()
    }
  }, [isOpen, leadId])

  const loadLead = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/crm/leads/${leadId}`)
      const result = await response.json()

      if (result.success) {
        setLead(result.data)
      } else {
        setError(result.error?.message || 'Error loading lead')
      }
    } catch (err) {
      setError('Failed to load lead details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEdit = () => {
    if (lead) {
      onEdit(lead)
      onClose()
    }
  }

  const handleClose = () => {
    setLead(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <User className="h-6 w-6 text-primary" />
                Lead Details
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                View comprehensive lead information and activity history
              </DialogDescription>
            </div>
            {lead && (
              <Button onClick={handleEdit} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Lead
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading lead details...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive-foreground">{error}</span>
          </div>
        )}

        {lead && !loading && !error && (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Name</div>
                      <div className="text-lg font-semibold">{lead.name}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Source</div>
                      <Badge variant="outline" className="text-sm">
                        <Globe className="h-3 w-3 mr-1" />
                        {sourceLabels[lead.source] || lead.source}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Lead ID</div>
                      <div className="font-mono text-sm bg-muted px-2 py-1 rounded">{lead.id}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Contact Information</div>
                      <div className="space-y-2">
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        {!lead.email && !lead.phone && (
                          <div className="text-sm text-muted-foreground">No contact information</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(lead.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-sm font-medium text-muted-foreground mb-2">COD Status</div>
                    {(() => {
                      const config = getStatusConfig(lead.cod_status, 'cod')
                      const Icon = config.icon
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`h-8 w-8 text-${config.color}-500`} />
                          <Badge variant="outline" className="text-sm">
                            {config.label}
                          </Badge>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Logistics Status</div>
                    {(() => {
                      const config = getStatusConfig(lead.logistic_status, 'logistic')
                      const Icon = config.icon
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`h-8 w-8 text-${config.color}-500`} />
                          <Badge variant="outline" className="text-sm">
                            {config.label}
                          </Badge>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="text-center p-4 rounded-lg bg-muted/30">
                    <div className="text-sm font-medium text-muted-foreground mb-2">KPI Status</div>
                    {(() => {
                      const config = getStatusConfig(lead.kpi_status, 'kpi')
                      const Icon = config.icon
                      return (
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`h-8 w-8 text-${config.color}-500`} />
                          <Badge variant={lead.kpi_status === 'won' ? 'default' : 'outline'} className="text-sm">
                            {config.label}
                          </Badge>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tagRelation) => (
                      <Badge
                        key={tagRelation.tag.id}
                        variant="outline"
                        className="text-sm"
                        style={{
                          backgroundColor: tagRelation.tag.color + '20',
                          borderColor: tagRelation.tag.color,
                          color: tagRelation.tag.color
                        }}
                      >
                        {tagRelation.tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {lead.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Timeline */}
            {lead.events && lead.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Activity Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.events.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          {index < lead.events!.length - 1 && (
                            <div className="w-px h-8 bg-border mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize text-sm">
                              {event.type.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(event.created_at)}
                            </span>
                          </div>
                          {event.details && (
                            <div className="text-sm text-muted-foreground">
                              {(() => {
                                if (typeof event.details === 'object') {
                                  if (event.details.updated_fields) {
                                    return `Updated: ${event.details.updated_fields.join(', ')}`
                                  }
                                  if (event.details.notes || event.details.source) {
                                    return Object.entries(event.details)
                                      .map(([key, value]) => `${key}: ${value}`)
                                      .join(', ')
                                  }
                                  return Object.entries(event.details)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ')
                                }
                                return event.details
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}