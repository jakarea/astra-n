import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLeadNotification } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        {
          error: 'Invalid content type',
          message: 'Content-Type must be application/json'
        },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (_error) {
    return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      )
    }

    // Validate webhook secret from header
        const webhookSecret = request.headers.get('x-webhook-secret') || request.headers.get('webhook-secret')
    if (!webhookSecret || typeof webhookSecret !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing webhook secret',
          message: 'x-webhook-secret header is required'
        },
        { status: 401 }
      )
    }

    const leadData = body

    // Find user by webhook secret
        const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('webhook_secret', webhookSecret)
      .single()

    if (userError || !user) {      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid or does not exist'
        },
        { status: 401 }
      )
    }

    // Validate required lead fields
        const { source } = leadData
    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'source is required and must be a string'
        },
        { status: 400 }
      )
    }

    // Validate optional fields if provided
        const allowedFields = ['name', 'email', 'phone', 'source', 'logistic_status', 'cod_status', 'kpi_status', 'notes']
    const invalidFields = Object.keys(leadData).filter(field => !allowedFields.includes(field))
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid fields',
          message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (leadData.email && typeof leadData.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(leadData.email)) {
        return NextResponse.json(
          {
            error: 'Invalid email format',
            message: 'Please provide a valid email address'
          },
          { status: 400 }
        )
      }
    }

    // Validate phone format if provided (basic validation)
    if (leadData.phone && typeof leadData.phone === 'string') {
      const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/
      if (!phoneRegex.test(leadData.phone.trim())) {
        return NextResponse.json(
          {
            error: 'Invalid phone format',
            message: 'Please provide a valid phone number (7-20 digits, spaces, dashes, parentheses, and + allowed)'
          },
          { status: 400 }
        )
      }
    }

    // Validate status fields if provided
        const validLogisticStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    const validCodStatuses = ['pending', 'confirmed', 'rejected']
    const validKpiStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

    if (leadData.logistic_status && !validLogisticStatuses.includes(leadData.logistic_status)) {
      return NextResponse.json(
        {
          error: 'Invalid logistic status',
          message: `logistic_status must be one of: ${validLogisticStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    if (leadData.cod_status && !validCodStatuses.includes(leadData.cod_status)) {
      return NextResponse.json(
        {
          error: 'Invalid COD status',
          message: `cod_status must be one of: ${validCodStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    if (leadData.kpi_status && !validKpiStatuses.includes(leadData.kpi_status)) {
      return NextResponse.json(
        {
          error: 'Invalid KPI status',
          message: `kpi_status must be one of: ${validKpiStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Prepare lead data for insertion
        const leadInsertData = {
      user_id: user.id,
      name: leadData.name || null,
      email: leadData.email || null,
      phone: leadData.phone || null,
      source: leadData.source,
      logistic_status: leadData.logistic_status || null,
      cod_status: leadData.cod_status || null,
      kpi_status: leadData.kpi_status || null,
      notes: leadData.notes || null
    }
    // Insert lead into database
        const { data: createdLead, error: insertError } = await supabaseAdmin
      .from('crm_leads')
      .insert([leadInsertData])
      .select()
      .single()

    if (insertError) {      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create lead in database'
        },
        { status: 500 }
      )
    }
    // Send Telegram notification (non-blocking)
    sendLeadNotification(user.id, createdLead).then((result) => {    }).catch((error) => {    })

    return NextResponse.json(
      {
        success: true,
        message: 'Lead created successfully',
        data: {
          id: createdLead.id,
          name: createdLead.name,
          email: createdLead.email,
          phone: createdLead.phone,
          source: createdLead.source,
          logistic_status: createdLead.logistic_status,
          cod_status: createdLead.cod_status,
          kpi_status: createdLead.kpi_status,
          notes: createdLead.notes,
          created_at: createdLead.created_at
        }
      },
      { status: 201 }
    )

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the webhook'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for this webhook endpoint'
    },
    { status: 405 }
  )
}