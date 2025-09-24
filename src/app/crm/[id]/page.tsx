'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/crm/copy-button'
import { ArrowLeft, Edit, Mail, Phone, Calendar, User, Package, Tag, Activity } from 'lucide-react'

// Status badge helper
function getStatusBadge(status: string | null, type: 'cod' | 'logistic' | 'kpi') {
  if (!status) return <Badge variant="outline">-</Badge>

  const variants = {
    cod: {
      pending: { variant: "outline" as const, label: "Pending" },
      confirmed: { variant: "default" as const, label: "Confirmed" },
      rejected: { variant: "destructive" as const, label: "Rejected" }
    },
    logistic: {
      pending: { variant: "outline" as const, label: "Pending" },
      processing: { variant: "secondary" as const, label: "Processing" },
      shipped: { variant: "outline" as const, label: "Shipped" },
      delivered: { variant: "default" as const, label: "Delivered" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" }
    },
    kpi: {
      won: { variant: "default" as const, label: "Won" },
      lost: { variant: "destructive" as const, label: "Lost" },
      pending: { variant: "outline" as const, label: "Pending" },
      qualified: { variant: "secondary" as const, label: "Qualified" }
    }
  }

  const config = variants[type][status as keyof typeof variants[typeof type]]
  return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge variant="outline" className="capitalize">{status}</Badge>
}

export default function CRMViewPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
            total_amount,
            customer:customers(name, email)
          ),
          user:users(name)
        `)
        .eq('id', leadId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Lead not found or access denied')
        } else {
          setError(error.message)
        }
        return
      }

      setLead(data)
    } catch (err) {
      console.error('Error loading lead:', err)
      setError('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CRM
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">Error</h3>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lead) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to CRM
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.name || 'Unnamed Lead'}</h1>
            <p className="text-muted-foreground">Lead ID: {lead.id}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/crm/${lead.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Lead
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Lead Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="font-medium">{lead.name || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              {lead.email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p>{lead.email}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">N/A</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              {lead.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{lead.phone}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">N/A</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Source</label>
              <Badge variant="outline" className="capitalize">
                {lead.source.replace('_', ' ')}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p>{new Date(lead.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">COD Status</label>
              <div className="mt-1">
                {getStatusBadge(lead.codStatus, 'cod')}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Logistics Status</label>
              <div className="mt-1">
                {getStatusBadge(lead.logisticStatus, 'logistic')}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">KPI Status</label>
              <div className="mt-1">
                {getStatusBadge(lead.kpiStatus, 'kpi')}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
              <p className="font-medium">{lead.user?.name || 'Unassigned'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.order ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono">{lead.order.externalOrderId}</p>
                    <CopyButton text={lead.order.externalOrderId} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="text-lg font-bold">€{Number(lead.order.totalAmount).toFixed(2)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <p className="font-medium">{lead.order.customer.name}</p>
                  {lead.order.customer.email && (
                    <p className="text-sm text-muted-foreground">{lead.order.customer.email}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Items</label>
                  <p className="text-sm">{lead.order.items.length} item(s)</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No order associated</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tagRelation) => (
                <Badge
                  key={tagRelation.tag.id}
                  variant="outline"
                  style={tagRelation.tag.color ? {
                    backgroundColor: tagRelation.tag.color + '20',
                    borderColor: tagRelation.tag.color
                  } : undefined}
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
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Events/Activity */}
      {lead.events && lead.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lead.events.map((event) => (
                <div key={event.id} className="border-l-2 border-muted pl-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">{event.type.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        by {event.user.name} • {new Date(event.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  {event.details && (
                    <pre className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {typeof event.details === 'string' ? event.details : JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}