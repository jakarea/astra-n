import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWebhookChangeNotification } from '@/lib/telegram'

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

    const customerData = body

    // Find integration by webhook secret (and get user info)
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select(`
        id,
        user_id,
        name,
        type,
        users!integrations_user_id_fkey(id, name, email)
      `)
      .eq('webhook_secret', webhookSecret)
      .single()

    if (integrationError || !integration) {
      console.error('[WEBHOOKS] Integration lookup error:', integrationError)
      return NextResponse.json(
        {
          error: 'Invalid webhook secret',
          message: 'The provided webhook secret is not valid or does not exist'
        },
        { status: 401 }
      )
    }

    console.log('[WEBHOOKS] Request authenticated for integration:', {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      userId: integration.user_id
    })

    // Validate required customer fields
    const { name, email } = customerData
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'name is required and must be a non-empty string'
        },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'email is required and must be a non-empty string'
        },
        { status: 400 }
      )
    }

    // Validate optional fields if provided
    const allowedFields = ['name', 'email', 'phone', 'address', 'source', 'order_id']
    const invalidFields = Object.keys(customerData).filter(field => !allowedFields.includes(field))
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid fields',
          message: `Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${allowedFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        },
        { status: 400 }
      )
    }

    // Validate phone format if provided (basic validation)
    if (customerData.phone && typeof customerData.phone === 'string') {
      const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/
      if (!phoneRegex.test(customerData.phone.trim())) {
        return NextResponse.json(
          {
            error: 'Invalid phone format',
            message: 'Please provide a valid phone number (7-20 digits, spaces, dashes, parentheses, and + allowed)'
          },
          { status: 400 }
        )
      }
    }

    // Check if customer already exists (prevent duplicates)
    const { data: existingCustomer, error: _existingError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('user_id', integration.user_id)
      .eq('email', email)
      .single()

    if (existingCustomer) {
      return NextResponse.json(
        {
          error: 'Customer already exists',
          message: 'A customer with this email already exists for your account',
          data: {
            id: existingCustomer.id,
            email: email
          }
        },
        { status: 409 }
      )
    }

    // Parse address if provided
    let parsedAddress = null
    if (customerData.address) {
      if (typeof customerData.address === 'string') {
        try {
          parsedAddress = JSON.parse(customerData.address)
        } catch (_e) {
          return NextResponse.json(
            {
              error: 'Invalid address format',
              message: 'Address must be a valid JSON object'
            },
            { status: 400 }
          )
        }
      } else if (typeof customerData.address === 'object') {
        parsedAddress = customerData.address
      } else {
        return NextResponse.json(
          {
            error: 'Invalid address format',
            message: 'Address must be a JSON object or string'
          },
          { status: 400 }
        )
      }
    }

    // Validate order_id if provided
    if (customerData.order_id && typeof customerData.order_id !== 'number') {
      return NextResponse.json(
        {
          error: 'Invalid order_id format',
          message: 'order_id must be a number'
        },
        { status: 400 }
      )
    }

    // Prepare customer data for insertion
    const customerInsertData = {
      user_id: integration.user_id,
      order_id: customerData.order_id || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: customerData.phone?.trim() || null,
      address: parsedAddress,
      source: customerData.source || `${integration.type}_webhook`
    }

    console.log('[WEBHOOKS] Creating customer with data:', customerInsertData)

    // Insert customer into database
    const { data: createdCustomer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert([customerInsertData])
      .select()
      .single()

    if (insertError) {
      console.error('[WEBHOOKS] Insert error:', insertError)

      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            error: 'Duplicate customer',
            message: 'A customer with this email already exists'
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to create customer in database'
        },
        { status: 500 }
      )
    }

    console.log('[WEBHOOKS] Customer created successfully:', createdCustomer)

    // Send Telegram notification (non-blocking)
    sendWebhookChangeNotification(integration.user_id, {
      type: 'New Customer Created',
      details: `New customer "${createdCustomer.name}" (${createdCustomer.email}) has been added via ${integration.name} webhook`,
      integration: integration.name
    }).then((result) => {
      console.log('[WEBHOOKS] Telegram notification result:', result)
    }).catch((error) => {
      console.error('[WEBHOOKS] Telegram notification error:', error)
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Customer created successfully',
        integration: {
          id: integration.id,
          name: integration.name,
          type: integration.type
        },
        data: {
          id: createdCustomer.id,
          name: createdCustomer.name,
          email: createdCustomer.email,
          phone: createdCustomer.phone,
          address: createdCustomer.address,
          source: createdCustomer.source,
          order_id: createdCustomer.order_id,
          created_at: createdCustomer.created_at
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('[WEBHOOKS] Unexpected error:', error)
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