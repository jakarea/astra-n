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
import { EditOrderModal } from '@/components/orders/edit-order-modal'
import { ArrowLeft, Edit, Mail, Phone, Calendar, Package, DollarSign, Store, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">-</Badge>

  const variants = {
    pending: { variant: "outline" as const, label: "Pending" },
    processing: { variant: "secondary" as const, label: "Processing" },
    paid: { variant: "default" as const, label: "Paid" },
    shipped: { variant: "default" as const, label: "Shipped" },
    delivered: { variant: "default" as const, label: "Delivered" },
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const supabase = getAuthenticatedClient()

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, email, phone, address),
          integration:integrations!inner(name, type, user_id),
          items:order_items(*)
        `)
        .eq('id', orderId)
        .eq('integration.user_id', session.user.id)
        .single()

      if (orderError) {
        throw new Error(orderError.message)
      }

      setOrder(orderData)
    } catch (error: any) {      alert(`Failed to load order: ${error.message}`)
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderUpdated = (updatedOrder: any) => {
    setOrder(updatedOrder)
    setEditModalOpen(false)
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Not Found</h1>
            <p className="text-muted-foreground">The requested order could not be found</p>
          </div>
        </div>
      </div>
    )
  }

  const totalItems = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.external_order_id}</h1>
            <p className="text-muted-foreground">Order Details</p>
          </div>
        </div>
        <Button onClick={() => setEditModalOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Order
        </Button>
      </div>

      {/* Order Info and Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono">{order.external_order_id}</span>
                  <CopyButton text={order.external_order_id} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">€{Number(order.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items</p>
                <div className="flex items-center gap-2 mt-1">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{totalItems} item(s)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(order.order_created_at || order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Integration</p>
                <div className="flex items-center gap-2 mt-1">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="capitalize">
                    {order.integration?.type || 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>

            {order.tracking_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking ID</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono">{order.tracking_id}</span>
                  <CopyButton text={order.tracking_id} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1"
                    asChild
                  >
                    <a
                      href={`https://www.aftership.com/it/track/${order.tracking_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Track
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="mt-1 font-medium">{order.customer?.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.email || 'No email'}</span>
                {order.customer?.email && <CopyButton text={order.customer.email} />}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer?.phone || 'Not provided'}</span>
                {order.customer?.phone && <CopyButton text={order.customer.phone} />}
              </div>
            </div>

            {order.customer?.id && (
              <div className="pt-4">
                <Button variant="outline" asChild>
                  <Link href={`/customers/${order.customer.id}`}>
                    View Customer Details
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!order.items || order.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No items found for this order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price per Unit</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{item.product_sku}</span>
                          <CopyButton text={item.product_sku} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.quantity}</span>
                      </TableCell>
                      <TableCell>
                        €{Number(item.price_per_unit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">
                        €{(Number(item.price_per_unit || 0) * Number(item.quantity || 0)).toFixed(2)}
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
      <EditOrderModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleOrderUpdated}
        orderId={orderId}
      />
    </div>
  )
}