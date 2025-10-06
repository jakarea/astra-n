import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Generate a secure random webhook secret
function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user ID from request body or header
    const body = await request.json().catch(() => ({}))
    const userId = body.user_id

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json(
        { error: 'Invalid integration ID' },
        { status: 400 }
      )
    }

    // Get user info to check role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const userRole = userData?.role

    // Check if integration exists and belongs to user (or user is admin)
    let integrationQuery = supabase
      .from('integrations')
      .select('id, name, type, user_id, webhook_secret')
      .eq('id', integrationId)

    // Non-admin users can only access their own integrations
    if (userRole !== 'admin') {
      integrationQuery = integrationQuery.eq('user_id', userId)
    }

    const { data: integration, error: fetchError } = await integrationQuery.single()

    if (fetchError || !integration) {      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 }
      )
    }

    // Generate new webhook secret
    const newWebhookSecret = generateWebhookSecret()

    // Update integration with new webhook secret
    let updateQuery = supabase
      .from('integrations')
      .update({
        webhook_secret: newWebhookSecret,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)

    // Non-admin users can only update their own integrations
    if (userRole !== 'admin') {
      updateQuery = updateQuery.eq('user_id', userId)
    }

    const { data: updatedIntegration, error: updateError } = await updateQuery
      .select('id, name, type, webhook_secret, updated_at')
      .single()

    if (updateError) {      return NextResponse.json(
        { error: 'Failed to update webhook secret' },
        { status: 500 }
      )
    }
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
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json(
        { error: 'Invalid integration ID' },
        { status: 400 }
      )
    }

    // Get user info to check role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    const userRole = userData?.role

    // Get integration webhook info
    let integrationQuery = supabase
      .from('integrations')
      .select('id, name, type, webhook_secret')
      .eq('id', integrationId)

    // Non-admin users can only access their own integrations
    if (userRole !== 'admin') {
      integrationQuery = integrationQuery.eq('user_id', userId)
    }

    const { data: integration, error: fetchError } = await integrationQuery.single()

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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}