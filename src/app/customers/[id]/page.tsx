'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/crm/copy-button'
import { EditCustomerModal } from '@/components/customers/edit-customer-modal'
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Package, DollarSign } from 'lucide-react'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  useEffect(() => {
    if (customerId) {
      loadCustomerDetails()
    }
  }, [customerId])

  const loadCustomerDetails = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const supabase = getAuthenticatedClient()

      // Load customer details
        const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('user_id', session.user.id)
        .single()

      if (customerError) {
        throw new Error(customerError.message)
      }

      setCustomer(customerData)

      // Load customer orders
        const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          integration:integrations(name, type),
          items:order_items(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (ordersError) {      } else {
        setOrders(ordersData || [])
      }
    } catch (error: any) {      alert(`Failed to load customer: ${error.message}`)
      router.push('/customers')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerUpdated = (updatedCustomer: any) => {
    setCustomer(updatedCustomer)
    setEditModalOpen(false)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "outline" as const, label: "Pending" },
      processing: { variant: "secondary" as const, label: "Processing" },
      completed: { variant: "default" as const, label: "Completed" },
      cancelled: { variant: "destructive" as const, label: "Cancelled" },
      refunded: { variant: "destructive" as const, label: "Refunded" }
    }

    const config = variants[status as keyof typeof variants]
    return config ? (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    ) : (
      <Badge variant="outline" className="capitalize">
        {status}
      </Badge>
    )
  }

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Not Found</h1>
            <p className="text-muted-foreground">The requested customer could not be found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <Button onClick={() => setEditModalOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Customer Info and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="mt-1">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer ID</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono">{customer.id}</span>
                  <CopyButton text={customer.id.toString()} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                  <CopyButton text={customer.email} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone || 'Not provided'}</span>
                  {customer.phone && <CopyButton text={customer.phone} />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {customer.source?.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Joined</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>


            {customer.address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {typeof customer.address === 'object' ? (
                      <div>
                        {customer.address.billing ? (
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">Billing Address</div>
                            {customer.address.billing.address_1 && <div>{customer.address.billing.address_1}</div>}
                            {customer.address.billing.address_2 && <div>{customer.address.billing.address_2}</div>}
                            <div>
                              {customer.address.billing.city && `${customer.address.billing.city}`}
                              {customer.address.billing.state && `, ${customer.address.billing.state}`}
                              {customer.address.billing.postcode && ` ${customer.address.billing.postcode}`}
                            </div>
                            {customer.address.billing.country && <div>{customer.address.billing.country}</div>}

                            {customer.address.shipping && customer.address.shipping !== customer.address.billing && (
                              <div className="mt-2">
                                <div className="font-medium text-xs text-muted-foreground mb-1">Shipping Address</div>
                                {customer.address.shipping.address_1 && <div>{customer.address.shipping.address_1}</div>}
                                {customer.address.shipping.address_2 && <div>{customer.address.shipping.address_2}</div>}
                                <div>
                                  {customer.address.shipping.city && `${customer.address.shipping.city}`}
                                  {customer.address.shipping.state && `, ${customer.address.shipping.state}`}
                                  {customer.address.shipping.postcode && ` ${customer.address.shipping.postcode}`}
                                </div>
                                {customer.address.shipping.country && <div>{customer.address.shipping.country}</div>}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Fallback for old address format
                          <div>
                            {customer.address.street && <div>{customer.address.street}</div>}
                            <div>
                              {customer.address.city && `${customer.address.city}`}
                              {customer.address.state && `, ${customer.address.state}`}
                              {customer.address.postal_code && ` ${customer.address.postal_code}`}
                            </div>
                            {customer.address.country && <div>{customer.address.country}</div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      customer.address
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">Lifetime orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Lifetime value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{averageOrderValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per order average</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Order History ({totalOrders})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found for this customer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Integration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{order.external_order_id}</span>
                          <CopyButton text={order.external_order_id} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(order.order_created_at || order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell>
                        {order.items?.length || 0} item(s)
                      </TableCell>
                      <TableCell className="font-medium">
                        €{Number(order.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.integration?.name || 'Unknown'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <EditCustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleCustomerUpdated}
        customerId={customerId}
      />
    </div>
  )
}