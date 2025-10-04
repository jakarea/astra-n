import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTracking, getTrackingById, formatTrackingStatus, detectCourier, createTracking } from '@/lib/aftership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase }
  } catch (error) {
    return null
  }
}

/**
 * GET - Get tracking status for an order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionInfo = getSessionFromRequest(request)

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get order with tracking info
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, tracking_id, tracking_slug, external_order_id')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user has access
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin' && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Step 1: Order data retrieved', {
      order_id: order.id,
      tracking_id: order.tracking_id,
      tracking_slug: order.tracking_slug,
      external_order_id: order.external_order_id
    })

    if (!order.tracking_id) {
      console.log('Step 1 FAILED: No tracking ID found')
      return NextResponse.json({ error: 'No tracking ID found for this order' }, { status: 404 })
    }

    try {
      let tracking

      // If we have both slug and tracking number, use them directly
      if (order.tracking_slug && order.tracking_id) {
        console.log('Step 2: Using existing slug and tracking number', {
          slug: order.tracking_slug,
          tracking_number: order.tracking_id
        })
        tracking = await getTracking(order.tracking_slug, order.tracking_id)
        console.log('Step 3: Tracking retrieved successfully')
      } else {
        console.log('Step 2: No slug found, will try all your carriers for tracking number:', order.tracking_id)

        // Skip auto-detection and directly try your carriers (GLS, Bartolini/BRT, SDA, TNT)
        // AfterShip courier slugs: https://developers.aftership.com/reference/couriers
        const couriers = [
          'bartolini',      // Bartolini (BRT)
          'gls-italy',      // GLS Italy
          'sda-italy',      // SDA Italy
          'tnt-italy',      // TNT Italy
          'tnt',            // TNT (generic)
          'gls'             // GLS (generic)
        ]

        console.log('Step 3: Will try these couriers:', couriers)

        // Try each courier until one works
        let tracking: any = null
        let successfulSlug: string | null = null

        for (const slug of couriers) {
          console.log('Step 4: Trying courier:', slug)

          try {
            tracking = await createTracking({
              tracking_number: order.tracking_id,
              slug: slug,
              title: `Order #${order.external_order_id}`,
              order_id: order.external_order_id
            })
            console.log('Step 5: Tracking created successfully with courier:', slug)
            successfulSlug = slug
            break // Success, stop trying other couriers

          } catch (createError: any) {
            console.log('Step 5 ERROR with courier', slug + ':', createError.message)

            // If tracking already exists, try to fetch it
            if (createError.message.includes('already exists')) {
              console.log('Step 6: Tracking already exists with courier:', slug)
              try {
                tracking = await getTracking(slug, order.tracking_id)
                console.log('Step 7: Existing tracking retrieved successfully')
                successfulSlug = slug
                break // Success, stop trying other couriers
              } catch (getError) {
                console.log('Failed to get existing tracking, trying next courier')
                continue
              }
            }

            // If not the last courier, try the next one
            if (slug !== couriers[couriers.length - 1]) {
              console.log('Trying next courier...')
              continue
            } else {
              // Last courier failed
              throw new Error(`Failed to create tracking with any courier. Last error: ${createError.message}`)
            }
          }
        }

        if (!tracking || !successfulSlug) {
          throw new Error('Failed to create or retrieve tracking with any supported courier')
        }

        console.log('Step 6: Updating order with successful slug:', successfulSlug)
        // Update the order with the successful slug
        await supabase
          .from('orders')
          .update({ tracking_slug: successfulSlug })
          .eq('id', id)
      }

      console.log('Step 7: Formatting tracking status')
      const formatted = formatTrackingStatus(tracking)

      console.log('Step 8: Returning formatted tracking data', {
        status: formatted.status,
        statusLabel: formatted.statusLabel
      })

      return NextResponse.json({
        success: true,
        tracking: {
          tracking_number: tracking.tracking_number,
          slug: tracking.slug,
          tag: tracking.tag,
          subtag: tracking.subtag,
          ...formatted,
          checkpoints: tracking.checkpoints,
          created_at: tracking.created_at,
          updated_at: tracking.updated_at
        }
      })

    } catch (aftershipError: any) {
      console.log('FINAL ERROR: AfterShip API error:', aftershipError.message)
      return NextResponse.json({
        error: 'Failed to fetch tracking information from AfterShip',
        details: aftershipError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.log('CRITICAL ERROR in tracking-status endpoint:', {
      message: error.message,
      stack: error.stack,
      error: error
    })
    return NextResponse.json({
      error: 'Failed to fetch tracking status',
      details: error.message,
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message
      }
    }, { status: 500 })
  }
}
