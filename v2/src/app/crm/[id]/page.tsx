import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/crm/copy-button'
import { ArrowLeft, Edit, Mail, Phone, Calendar, User, Package, Tag, Activity } from 'lucide-react'

interface CRMViewPageProps {
  params: { id: string }
}

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

export default async function CRMViewPage({ params }: CRMViewPageProps) {
  const leadId = parseInt(params.id)

  if (isNaN(leadId)) {
    notFound()
  }

  // Direct Prisma query with all relations
  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    include: {
      order: {
        include: {
          customer: true,
          items: true
        }
      },
      user: true,
      events: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  })

  if (!lead) {
    notFound()
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