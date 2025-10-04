/**
 * AfterShip API Integration
 * Documentation: https://developers.aftership.com/reference/tracking
 */

const AFTERSHIP_API_KEY = process.env.AFTERSHIP_API_KEY!
const AFTERSHIP_API_URL = 'https://api.aftership.com/tracking/2024-07/trackings'

export interface AfterShipTracking {
  id: string
  tracking_number: string
  slug: string
  tag: string
  subtag: string
  title?: string
  order_id?: string
  order_id_path?: string
  shipment_type: string
  checkpoints: Array<{
    slug: string
    checkpoint_time: string
    city?: string
    coordinates?: number[]
    country_iso3?: string
    country_name?: string
    message?: string
    state?: string
    tag: string
    subtag?: string
    zip?: string
  }>
  created_at: string
  updated_at: string
  tracking_postal_code?: string
  tracking_ship_date?: string
  delivery_time?: number
  expected_delivery?: string
  transit_time?: number
}

export interface AfterShipResponse {
  meta: {
    code: number
    message?: string
    type?: string
  }
  data: {
    tracking: AfterShipTracking
  }
}

export interface AfterShipCreateRequest {
  tracking_number: string
  slug?: string
  title?: string
  order_id?: string
}

/**
 * Create a new tracking in AfterShip
 */
export async function createTracking(params: AfterShipCreateRequest): Promise<AfterShipTracking> {
  console.log('AfterShip createTracking called with params:', params)

  // For 2024-07 API, params are sent directly without wrapping in "tracking"
  console.log('AfterShip request body:', JSON.stringify(params, null, 2))

  const response = await fetch(`${AFTERSHIP_API_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'as-api-key': AFTERSHIP_API_KEY,
    },
    body: JSON.stringify(params)
  })

  console.log('AfterShip response status:', response.status)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ meta: { message: 'Unknown error' } }))
    console.log('AfterShip error response:', error)
    throw new Error(error.meta?.message || `AfterShip API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('AfterShip success response:', data)
  // In 2024-07 API, tracking data is directly in data, not data.tracking
  return data.data as AfterShipTracking
}

/**
 * Get tracking information
 */
export async function getTracking(slug: string, trackingNumber: string): Promise<AfterShipTracking> {
  const response = await fetch(`${AFTERSHIP_API_URL}/${slug}/${trackingNumber}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'as-api-key': AFTERSHIP_API_KEY,
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ meta: { message: 'Unknown error' } }))
    throw new Error(error.meta?.message || `AfterShip API error: ${response.status}`)
  }

  const data = await response.json()
  // In 2024-07 API, tracking data is directly in data, not data.tracking
  return data.data as AfterShipTracking
}

/**
 * Get tracking by ID
 */
export async function getTrackingById(trackingId: string): Promise<AfterShipTracking> {
  const response = await fetch(`${AFTERSHIP_API_URL}/${trackingId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'as-api-key': AFTERSHIP_API_KEY,
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ meta: { message: 'Unknown error' } }))
    throw new Error(error.meta?.message || `AfterShip API error: ${response.status}`)
  }

  const data = await response.json()
  // In 2024-07 API, tracking data is directly in data, not data.tracking
  return data.data as AfterShipTracking
}

/**
 * Auto-detect courier from tracking number
 */
export async function detectCourier(trackingNumber: string): Promise<string[]> {
  console.log('AfterShip detectCourier called with tracking number:', trackingNumber)

  // For 2024-07 API, send params directly without "tracking" wrapper
  const requestBody = {
    tracking_number: trackingNumber
  }
  console.log('AfterShip detect courier request:', JSON.stringify(requestBody, null, 2))

  const response = await fetch(`https://api.aftership.com/tracking/2024-07/couriers/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'as-api-key': AFTERSHIP_API_KEY,
    },
    body: JSON.stringify(requestBody)
  })

  console.log('AfterShip detect courier response status:', response.status)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ meta: { message: 'Unknown error' } }))
    console.log('AfterShip detect courier error:', error)
    throw new Error(error.meta?.message || `AfterShip API error: ${response.status}`)
  }

  const data = await response.json()
  console.log('AfterShip detect courier response:', data)

  const couriers = data.data?.couriers?.map((c: any) => c.slug) || []
  console.log('Detected courier slugs:', couriers)

  return couriers
}

/**
 * Format tracking status for display
 */
export function formatTrackingStatus(tracking: AfterShipTracking): {
  status: string
  statusLabel: string
  lastCheckpoint?: string
  lastLocation?: string
  lastTime?: string
  estimatedDelivery?: string
} {
  const statusMap: Record<string, string> = {
    'Pending': 'Pending',
    'InfoReceived': 'Info Received',
    'InTransit': 'In Transit',
    'OutForDelivery': 'Out for Delivery',
    'AttemptFail': 'Delivery Attempt Failed',
    'Delivered': 'Delivered',
    'AvailableForPickup': 'Available for Pickup',
    'Exception': 'Exception',
    'Expired': 'Tracking Expired'
  }

  const lastCheckpoint = tracking.checkpoints[tracking.checkpoints.length - 1]

  return {
    status: tracking.tag,
    statusLabel: statusMap[tracking.tag] || tracking.tag,
    lastCheckpoint: lastCheckpoint?.message,
    lastLocation: [lastCheckpoint?.city, lastCheckpoint?.state, lastCheckpoint?.country_name]
      .filter(Boolean)
      .join(', '),
    lastTime: lastCheckpoint?.checkpoint_time,
    estimatedDelivery: tracking.expected_delivery
  }
}
