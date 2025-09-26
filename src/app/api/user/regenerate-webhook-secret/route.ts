import { NextRequest, NextResponse } from 'next/server'
import { assignWebhookSecretToUser } from '@/lib/webhook-utils'
import { getSession } from '@/lib/auth'

export async function POST(_request: NextRequest) {
  try {
    // Get current user session
    const session = getSession()
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    console.log('[WEBHOOK] Regenerating webhook secret for user:', session.user.id)

    // Generate new webhook secret for the user
    const newWebhookSecret = await assignWebhookSecretToUser(session.user.id)

    console.log('[WEBHOOK] New webhook secret generated successfully')

    return NextResponse.json({
      success: true,
      message: 'Webhook secret regenerated successfully',
      webhookSecret: newWebhookSecret
    })

  } catch (error) {
    console.error('[WEBHOOK] Error regenerating webhook secret:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to regenerate webhook secret'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}