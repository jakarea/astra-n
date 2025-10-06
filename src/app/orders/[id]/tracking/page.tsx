'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, MapPin, Calendar, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TrackingCheckpoint {
  checkpoint_time: string
  city?: string
  country_name?: string
  message: string
  location?: string
}

interface TrackingData {
  tracking_number: string
  slug: string
  tag: string
  delivery_time?: string | number
  expected_delivery?: string
  shipment_type?: string
  shipment_pickup_date?: string
  destination_raw_location?: string
  origin_raw_location?: string
  checkpoints: TrackingCheckpoint[]
  courier_tracking_link?: string
}

export default function TrackingPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadOrderAndTracking()
  }, [orderId])

  const loadOrderAndTracking = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const supabase = getAuthenticatedClient()

      // Load order data
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, email),
          integration:integrations!inner(name, type, user_id)
        `)
        .eq('id', orderId)
        .single()

      if (orderError) {
        throw new Error(orderError.message)
      }

      // Check if user has access to this order
      if (session.user.role !== 'admin' && orderData.integration.user_id !== session.user.id) {
        toast.error('You do not have access to this order')
        router.push('/orders')
        return
      }

      setOrder(orderData)

      // Load tracking data from AfterShip
      if (orderData.tracking_id) {
        await loadTrackingData(orderData.tracking_id, orderData.tracking_slug)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load order')
      router.push('/orders')
    } finally {
      setLoading(false)
    }
  }

  const loadTrackingData = async (trackingNumber: string, slug?: string) => {
    try {
      const url = new URL('/api/aftership/get-tracking', window.location.origin)
      url.searchParams.append('tracking_number', trackingNumber)
      if (slug) {
        url.searchParams.append('slug', slug)
      }

      const response = await fetch(url.toString())
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load tracking data')
      }

      setTrackingData(result.data.tracking)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tracking data')
    }
  }

  const handleRefresh = async () => {
    if (!order?.tracking_id) return

    try {
      setRefreshing(true)
      await loadTrackingData(order.tracking_id, order.tracking_slug)
      toast.success('Tracking data refreshed')
    } catch (error: any) {
      toast.error('Failed to refresh tracking data')
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusColor = (tag: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-gray-500',
      'InfoReceived': 'bg-blue-500',
      'InTransit': 'bg-yellow-500',
      'OutForDelivery': 'bg-orange-500',
      'Delivered': 'bg-green-500',
      'AvailableForPickup': 'bg-purple-500',
      'Exception': 'bg-red-500',
      'Expired': 'bg-gray-400',
    }
    return colors[tag] || 'bg-gray-500'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Unknown'
    // Check for Unix epoch (Jan 1, 1970) or dates before 2000
    if (date.getTime() < new Date('2000-01-01').getTime()) return 'Unknown'

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!order?.tracking_id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Tracking Information</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Tracking Information</h3>
              <p className="text-muted-foreground">
                This order does not have a tracking number yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Tracking Information</h1>
            <p className="text-muted-foreground">
              Order #{order.external_order_id}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tracking Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{order.tracking_id}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Courier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="capitalize">
              {trackingData?.slug?.replace(/-/g, ' ') || 'Auto-detected'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {trackingData?.tag ? (
              <Badge className={getStatusColor(trackingData.tag)}>
                {trackingData.tag.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Loading...</span>
            )}
          </CardContent>
        </Card>

        {trackingData?.shipment_type && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Shipment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="capitalize">{trackingData.shipment_type}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Estimated Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {trackingData?.expected_delivery ? (
              <span>{formatDate(trackingData.expected_delivery)}</span>
            ) : trackingData?.delivery_time && typeof trackingData.delivery_time === 'number' ? (
              <span>Transit in {trackingData.delivery_time} days</span>
            ) : trackingData?.delivery_time && formatDate(trackingData.delivery_time.toString()) !== 'Unknown' ? (
              <span>{formatDate(trackingData.delivery_time.toString())}</span>
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracking History</CardTitle>
        </CardHeader>
        <CardContent>
          {trackingData?.checkpoints && trackingData.checkpoints.length > 0 ? (
            <div className="space-y-4">
              {trackingData.checkpoints
                .sort((a, b) => new Date(b.checkpoint_time).getTime() - new Date(a.checkpoint_time).getTime())
                .map((checkpoint, index) => (
                  <div
                    key={index}
                    className="relative pl-6 pb-4 border-l-2 border-border last:border-0"
                  >
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium">{checkpoint.message}</p>
                          {(checkpoint.location || checkpoint.city) && (
                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {checkpoint.location || `${checkpoint.city}${checkpoint.country_name ? `, ${checkpoint.country_name}` : ''}`}
                              </span>
                            </div>
                          )}
                          <time className="block mt-1 text-sm text-muted-foreground">
                            {formatDate(checkpoint.checkpoint_time)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tracking checkpoints available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button asChild className="w-full">
            <a
              href={`https://www.aftership.com/it/track/${order.tracking_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on AfterShip
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
