import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Server action to create lead
async function createLead(formData: FormData) {
  'use server'

  const name = formData.get('name') as string
  const email = formData.get('email') as string || null
  const phone = formData.get('phone') as string || null
  const source = formData.get('source') as string
  const logisticStatus = formData.get('logisticStatus') as string || null
  const codStatus = formData.get('codStatus') as string || null
  const kpiStatus = formData.get('kpiStatus') as string || null
  const notes = formData.get('notes') as string || null
  const orderId = formData.get('orderId') as string || null

  try {
    // Generate a temporary user ID for now (in real implementation, get from session)
        const tempUserId = crypto.randomUUID()

    const newLead = await prisma.crmLead.create({
      data: {
        name,
        email,
        phone,
        source,
        logisticStatus,
        codStatus,
        kpiStatus,
        notes,
        orderId: orderId ? parseInt(orderId) : null,
        userId: tempUserId, // In real app, get from authenticated user
      }
    })

    redirect(`/crm/${newLead.id}`)
  } catch (error) {    throw new Error('Failed to create lead')
  }
}

export default async function CRMNewPage() {
  // Get available orders for association (optional)
        const availableOrders = await prisma.order.findMany({
    include: {
      customer: true
    },
    where: {
      crmLead: null // Only orders without associated leads
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // Limit for performance
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Lead</h1>
          <p className="text-muted-foreground">Add a new lead to your CRM system</p>
        </div>
      </div>

      {/* Create Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLead} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
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
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select name="source" required>
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
                <Select name="codStatus">
                  <SelectTrigger>
                    <SelectValue placeholder="Select COD status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logisticStatus">Logistics Status</Label>
                <Select name="logisticStatus">
                  <SelectTrigger>
                    <SelectValue placeholder="Select logistics status" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select name="kpiStatus">
                  <SelectTrigger>
                    <SelectValue placeholder="Select KPI status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Association (Optional) */}
            {availableOrders.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="orderId">Associate with Order (Optional)</Label>
                <Select name="orderId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select an order to associate" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
                        <div className="flex justify-between items-center w-full">
                          <span className="font-mono text-sm">{order.externalOrderId}</span>
                          <span className="text-muted-foreground ml-2">
                            {order.customer.name} - €{Number(order.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes about this lead..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Create Lead
              </Button>
              <Button variant="outline" asChild>
                <Link href="/crm">
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Tips for Creating Leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Name</strong> is required - enter the lead&apos;s full name</p>
          <p>• <strong>Source</strong> helps track where leads come from</p>
          <p>• <strong>Email and Phone</strong> are optional but recommended for contact</p>
          <p>• <strong>Status fields</strong> can be updated later as the lead progresses</p>
          <p>• <strong>Order association</strong> links leads to existing orders</p>
          <p>• <strong>Notes</strong> can include additional context or follow-up actions</p>
        </CardContent>
      </Card>
    </div>
  )
}