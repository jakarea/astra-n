import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple validation function without Zod
function validateWebhookLead(data: any): { success: boolean; errors: string[]; data?: any } {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('name: Name is required')
  }

  if (data.email && (typeof data.email !== 'string' || !data.email.includes('@'))) {
    errors.push('email: Invalid email format')
  }

  if (!data.source || typeof data.source !== 'string' || data.source.trim().length === 0) {
    errors.push('source: Source is required')
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    errors: [],
    data: {
      name: data.name.trim(),
      email: data.email || null,
      phone: data.phone || null,
      source: data.source,
      logisticStatus: data.logisticStatus || 'pending',
      codStatus: data.codStatus || 'pending',
      kpiStatus: data.kpiStatus || 'new',
      notes: data.notes || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      externalId: data.externalId || null,
      webhookSource: data.webhookSource || null,
      metadata: data.metadata || null
    }
  }
}

// Enhanced error handler for webhooks
function handleError(error: unknown) {
  console.error('Webhook API Error:', error)

  if (error instanceof Error) {
    return {
      code: 'WEBHOOK_ERROR',
      message: 'Internal server error occurred',
      details: error.message,
      timestamp: new Date().toISOString()
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    details: 'Please contact support if this persists',
    timestamp: new Date().toISOString()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Create lead via webhook
export async function POST(request: NextRequest) {
  try {
    // Validate secret key - only use header
    const secretKey = request.headers.get('x-webhook-secret')

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_SECRET',
            message: 'Missing webhook secret key in header',
            details: 'Please provide x-webhook-secret header'
          }
        },
        { status: 401 }
      )
    }

    if (secretKey !== 'secrtekey') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SECRET',
            message: 'Invalid webhook secret key',
            details: 'The provided secret key does not match'
          }
        },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate input with custom validation
    const validation = validateWebhookLead(body)

    if (!validation.success) {
      const invalidFields = validation.errors.map(error => {
        const match = error.match(/^([^:]+):/)
        return match ? match[1] : 'unknown'
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validation.errors,
            invalidFields: [...new Set(invalidFields)]
          }
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data!

    // For webhook leads, we need a default user_id
    // Try to find an admin user or use the first available user
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    let userId = adminUser?.id

    // If no admin found, get the first user
    if (!userId) {
      const { data: firstUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single()

      if (firstUser) {
        userId = firstUser.id
      } else {
        // Create a default webhook user if no users exist
        const { data: newUser, error: createUserError } = await supabase
          .from('users')
          .insert([{
            id: crypto.randomUUID(),
            name: 'Webhook User',
            role: 'admin'
          }])
          .select('id')
          .single()

        if (createUserError) {
          throw new Error(`Failed to create webhook user: ${createUserError.message}`)
        }

        userId = newUser.id
      }
    }

    if (!userId) {
      throw new Error('No user available for webhook lead assignment')
    }

    // Create lead in database
    const leadData = {
      user_id: userId,
      name: validatedData.name,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      source: validatedData.source,
      logistic_status: validatedData.logisticStatus,
      cod_status: validatedData.codStatus,
      kpi_status: validatedData.kpiStatus,
      notes: validatedData.notes || null
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .insert([leadData])
      .select()
      .single()

    if (leadError) {
      throw new Error(`Failed to create lead: ${leadError.message}`)
    }

    // Handle tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      try {
        const tagPromises = validatedData.tags.map(async (tagName) => {
          const { data: existingTag, error: tagSelectError } = await supabase
            .from('crm_tags')
            .select('id')
            .eq('name', tagName)
            .single()

          if (tagSelectError && tagSelectError.code === 'PGRST116') {
            // Tag doesn't exist, create it
            const { data: newTag, error: tagCreateError } = await supabase
              .from('crm_tags')
              .insert([{ name: tagName, color: '#14b8a6' }])
              .select('id')
              .single()

            if (tagCreateError) {
              console.error(`Failed to create tag: ${tagCreateError.message}`)
              return null
            }
            return newTag.id
          } else if (tagSelectError) {
            console.error(`Tag lookup error: ${tagSelectError.message}`)
            return null
          }

          return existingTag.id
        })

        const tagIds = (await Promise.all(tagPromises)).filter(Boolean)

        if (tagIds.length > 0) {
          const leadTagInserts = tagIds.map(tagId => ({
            lead_id: lead.id,
            tag_id: tagId
          }))

          await supabase
            .from('crm_lead_tags')
            .insert(leadTagInserts)
        }
      } catch (tagError) {
        console.error('Failed to process tags:', tagError)
        // Don't fail the whole request for tag errors
      }
    }

    // Create initial event
    await supabase
      .from('crm_lead_events')
      .insert([{
        lead_id: lead.id,
        user_id: userId,
        type: 'webhook_created',
        details: {
          source: validatedData.source,
          webhook_source: validatedData.webhookSource,
          external_id: validatedData.externalId,
          metadata: validatedData.metadata,
          notes: validatedData.notes || null
        }
      }])

    // Return success with lead data
    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        created_at: lead.created_at
      },
      message: 'Lead created successfully via webhook'
    }, { status: 201 })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json(
      { success: false, error: appError },
      { status: 500 }
    )
  }
}

// GET - Webhook endpoint info (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'CRM Webhook Endpoint',
    version: '1.0',
    endpoint: '/api/webhooks/leads',
    method: 'POST',
    authentication: {
      type: 'header_based',
      header: 'x-webhook-secret',
      secret: 'secrtekey'
    },
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      source: 'external_api',
      logisticStatus: 'pending',
      codStatus: 'pending',
      kpiStatus: 'new',
      notes: 'Lead from external system',
      tags: ['urgent', 'vip'],
      externalId: 'ext_123',
      webhookSource: 'shopify',
      metadata: {
        order_id: '12345',
        campaign: 'summer_sale'
      }
    }
  })
}