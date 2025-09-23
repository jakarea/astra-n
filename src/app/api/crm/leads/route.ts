import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCrmLeadSchema } from '@/lib/validations'
import { validateAndSanitize } from '@/lib/security'
import { sanitizationPresets } from '@/lib/sanitization'

// Simple error handler
function handleError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof Error) {
    return {
      code: 'SERVER_ERROR',
      message: error.message
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred'
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch CRM leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const source = searchParams.get('source')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    // Database query - no fallback needed since database is working
    let query = supabase
      .from('crm_leads')
      .select(`
        *,
        events:crm_lead_events(id, type, details, created_at),
        tags:crm_lead_tags(
          tag:crm_tags(id, name, color)
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('kpi_status', status)
    }

    if (source) {
      query = query.eq('source', source)
    }


    const { data: leads, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: leads || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: (totalCount || 0) > offset + limit,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json(
      { success: false, error: appError },
      { status: 500 }
    )
  }
}

// POST - Create new CRM lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()


    // Validate and sanitize input
    const validation = validateAndSanitize(
      body,
      createCrmLeadSchema,
      sanitizationPresets.customer
    )

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') } },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Create lead in database
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .insert([{
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        source: validatedData.source,
        logistic_status: validatedData.logisticStatus || 'pending',
        cod_status: validatedData.codStatus || 'pending',
        kpi_status: validatedData.kpiStatus || 'new',
        notes: validatedData.notes || null
      }])
      .select()
      .single()

    if (leadError) {
      throw new Error(`Failed to create lead: ${leadError.message}`)
    }

    // Handle tags if provided
    if (validatedData.tags && validatedData.tags.length > 0) {
      // First, ensure tags exist
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
            throw new Error(`Failed to create tag: ${tagCreateError.message}`)
          }
          return newTag.id
        } else if (tagSelectError) {
          throw new Error(`Tag lookup error: ${tagSelectError.message}`)
        }

        return existingTag.id
      })

      const tagIds = await Promise.all(tagPromises)

      // Create lead-tag associations
      const leadTagInserts = tagIds.map(tagId => ({
        lead_id: lead.id,
        tag_id: tagId
      }))

      const { error: leadTagError } = await supabase
        .from('crm_lead_tags')
        .insert(leadTagInserts)

      if (leadTagError) {
        console.error('Failed to create lead tags:', leadTagError)
        // Don't throw here - lead is created, tags are bonus
      }
    }

    // Create initial event
    await supabase
      .from('crm_lead_events')
      .insert([{
        lead_id: lead.id,
        type: 'created',
        details: {
          source: validatedData.source,
          notes: validatedData.notes || null
        }
      }])

    // Fetch the complete lead with relations
    const { data: completeLead, error: fetchError } = await supabase
      .from('crm_leads')
      .select(`
        *,
        events:crm_lead_events(id, type, details, created_at),
        tags:crm_lead_tags(
          tag:crm_tags(id, name, color)
        )
      `)
      .eq('id', lead.id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch complete lead:', fetchError)
      // Return basic lead if fetch fails
      return NextResponse.json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      }, { status: 201 })
    }

    return NextResponse.json({
      success: true,
      data: completeLead,
      message: 'Lead created successfully'
    }, { status: 201 })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json(
      { success: false, error: appError },
      { status: 500 }
    )
  }
}