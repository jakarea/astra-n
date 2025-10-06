import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tracking_number } = await request.json()

    if (!tracking_number) {
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

    // Create tracking with auto-detect courier
    const response = await fetch('https://api.aftership.com/v4/trackings', {
      method: 'POST',
      headers: {
        'aftership-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tracking: {
          tracking_number,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.meta?.message || 'Failed to create tracking' },
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
