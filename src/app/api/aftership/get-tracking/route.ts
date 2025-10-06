import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingNumber = searchParams.get('tracking_number')
    const slug = searchParams.get('slug')

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.AFTER_SHIP_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AfterShip API key not configured' },
        { status: 500 }
      )
    }

    // Try to get tracking by tracking number first
    let url = `https://api.aftership.com/v4/trackings/${trackingNumber}`
    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'aftership-api-key': apiKey,
      },
    })

    let data = await response.json()

    // If failed and slug is provided, try with slug
    if (!response.ok && slug) {
      url = `https://api.aftership.com/v4/trackings/${slug}/${trackingNumber}`
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'aftership-api-key': apiKey,
        },
      })
      data = await response.json()
    }

    // If still failed, try to get all trackings and find matching one
    if (!response.ok) {
      const listUrl = `https://api.aftership.com/v4/trackings?tracking_numbers=${trackingNumber}`
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'aftership-api-key': apiKey,
        },
      })
      const listData = await listResponse.json()

      if (listResponse.ok && listData.data?.trackings?.length > 0) {
        return NextResponse.json({
          success: true,
          data: { tracking: listData.data.trackings[0] },
        })
      }

      return NextResponse.json(
        { error: data.meta?.message || 'Failed to get tracking' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
