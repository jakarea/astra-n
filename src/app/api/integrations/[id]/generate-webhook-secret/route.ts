import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/auth'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Generate a secure random webhook secret
function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json(
        { error: 'Invalid integration ID' },
        { status: 400 }
      )
    }

    console.log('[INTEGRATION_WEBHOOK] Generating webhook secret for integration:', integrationId)

    // Check if integration exists and belongs to user
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('id, name, type, user_id, webhook_secret')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !integration) {
      console.error('[INTEGRATION_WEBHOOK] Integration not found:', fetchError)
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 }
      )
    }

    // Generate new webhook secret
    const newWebhookSecret = generateWebhookSecret()

    // Update integration with new webhook secret
    const { data: updatedIntegration, error: updateError } = await supabase
      .from('integrations')
      .update({
        webhook_secret: newWebhookSecret,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .select('id, name, type, webhook_secret, updated_at')
      .single()

    if (updateError) {
      console.error('[INTEGRATION_WEBHOOK] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update webhook secret' },
        { status: 500 }
      )
    }

    console.log('[INTEGRATION_WEBHOOK] Webhook secret generated successfully for integration:', integrationId)

    return NextResponse.json({
      success: true,
      message: 'Webhook secret generated successfully',
      data: {
        id: updatedIntegration.id,
        name: updatedIntegration.name,
        type: updatedIntegration.type,
        webhook_secret: updatedIntegration.webhook_secret,
        webhook_urls: {
          customer: `${request.nextUrl.origin}/api/webhooks/customer`,
          lead: `${request.nextUrl.origin}/api/webhooks/lead`
        },
        updated_at: updatedIntegration.updated_at
      }
    })

  } catch (error: any) {
    console.error('[INTEGRATION_WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get current webhook secret and URLs for an integration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json(
        { error: 'Invalid integration ID' },
        { status: 400 }
      )
    }

    // Get integration webhook info
    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('id, name, type, webhook_secret')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        webhook_secret: integration.webhook_secret,
        has_webhook_secret: !!integration.webhook_secret,
        webhook_urls: integration.webhook_secret ? {
          customer: `${request.nextUrl.origin}/api/webhooks/customer`,
          lead: `${request.nextUrl.origin}/api/webhooks/lead`
        } : null
      }
    })

  } catch (error: any) {
    console.error('[INTEGRATION_WEBHOOK] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}