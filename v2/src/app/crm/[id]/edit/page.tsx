import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

interface CRMEditPageProps {
  params: { id: string }
}

// Server action to update lead
async function updateLead(formData: FormData) {
  'use server'

  const leadId = parseInt(formData.get('leadId') as string)
  const name = formData.get('name') as string
  const email = formData.get('email') as string || null
  const phone = formData.get('phone') as string || null
  const source = formData.get('source') as string
  const logisticStatus = formData.get('logisticStatus') as string || null
  const codStatus = formData.get('codStatus') as string || null
  const kpiStatus = formData.get('kpiStatus') as string || null
  const notes = formData.get('notes') as string || null

  try {
    await prisma.crmLead.update({
      where: { id: leadId },
      data: {
        name,
        email,
        phone,
        source,
        logisticStatus,
        codStatus,
        kpiStatus,
        notes,
      }
    })

    redirect(`/crm/${leadId}`)
  } catch (error) {
    console.error('Error updating lead:', error)
    throw new Error('Failed to update lead')
  }
}

export default async function CRMEditPage({ params }: CRMEditPageProps) {
  const leadId = parseInt(params.id)

  if (isNaN(leadId)) {
    notFound()
  }

  // Get lead data
  const lead = await prisma.crmLead.findUnique({
    where: { id: leadId },
    include: {
      order: true,
      user: true
    }
  })

  if (!lead) {
    notFound()
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
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLead} className="space-y-6">
            <input type="hidden" name="leadId" value={lead.id} />

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={lead.name || ''}
                  placeholder="Lead name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={lead.email || ''}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={lead.phone || ''}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select name="source" defaultValue={lead.source} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="email_campaign">Email Campaign</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="advertisement">Advertisement</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codStatus">COD Status</Label>
                <Select name="codStatus" defaultValue={lead.codStatus || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select COD status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Set</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logisticStatus">Logistics Status</Label>
                <Select name="logisticStatus" defaultValue={lead.logisticStatus || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select logistics status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Set</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpiStatus">KPI Status</Label>
                <Select name="kpiStatus" defaultValue={lead.kpiStatus || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select KPI status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Set</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={lead.notes || ''}
                placeholder="Additional notes about this lead..."
                rows={4}
              />
            </div>

            {/* Order Information (Read-only) */}
            {lead.order && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-medium mb-2">Associated Order (Read-only)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="ml-2 font-mono">{lead.order.externalOrderId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="ml-2 font-medium">€{Number(lead.order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" asChild>
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