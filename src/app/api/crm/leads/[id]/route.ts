import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { handleError } from '@/lib/error-handling'
import { updateCrmLeadSchema } from '@/lib/validations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log({params})
  try {
    const { id } = await params
    const leadId = parseInt(id)

    if (isNaN(leadId)) {
      return NextResponse.json({
        success: false,
        error: { message: 'Invalid lead ID' }
      }, { status: 400 })
    }

    const { data: lead, error } = await supabase
      .from('crm_leads')
      .select(`
        *,
        tags:crm_lead_tags(
          tag:crm_tags(*)
        ),
        events:crm_lead_events(*)
      `)
      .eq('id', leadId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: { message: 'Lead not found' }
        }, { status: 404 })
      }

      throw error
    }

    return NextResponse.json({
      success: true,
      data: lead
    })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json({
      success: false,
      error: { message: appError.message }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const leadId = parseInt(id)

    if (isNaN(leadId)) {
      return NextResponse.json({
        success: false,
        error: { message: 'Invalid lead ID' }
      }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateCrmLeadSchema.parse(body)

    const { tags, ...leadData } = validatedData

    // Transform camelCase to snake_case for database
    const dbData: any = {}
    for (const [key, value] of Object.entries(leadData)) {
      if (key === 'logisticStatus') {
        dbData.logistic_status = value
      } else if (key === 'codStatus') {
        dbData.cod_status = value
      } else if (key === 'kpiStatus') {
        dbData.kpi_status = value
      } else {
        dbData[key] = value
      }
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('crm_leads')
      .update({
        ...dbData,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: { message: 'Lead not found' }
        }, { status: 404 })
      }

      throw updateError
    }

    if (tags) {
      await supabase
        .from('crm_lead_tags')
        .delete()
        .eq('lead_id', leadId)

      if (tags.length > 0) {
        // Convert tag names to tag IDs
        const { data: existingTags, error: tagFetchError } = await supabase
          .from('crm_tags')
          .select('id, name')
          .in('name', tags)

        if (tagFetchError) {
          throw tagFetchError
        }

        const tagIds = existingTags?.map(tag => tag.id) || []

        const leadTags = tagIds.map(tagId => ({
          lead_id: leadId,
          tag_id: tagId
        }))

        const { error: tagsError } = await supabase
          .from('crm_lead_tags')
          .insert(leadTags)

        if (tagsError) {
          throw tagsError
        }
      }
    }

    const { data: leadEvent, error: eventError } = await supabase
      .from('crm_lead_events')
      .insert({
        lead_id: leadId,
        type: 'lead_updated',
        details: { updated_fields: Object.keys(leadData) }
      })

    if (eventError) {
      console.error('Failed to create lead event:', eventError)
    }

    const { data: finalLead, error: fetchError } = await supabase
      .from('crm_leads')
      .select(`
        *,
        tags:crm_lead_tags(
          tag:crm_tags(*)
        ),
        events:crm_lead_events(*)
      `)
      .eq('id', leadId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json({
      success: true,
      data: finalLead
    })

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        error: { message: 'Invalid input data', errors: (error as any).errors }
      }, { status: 400 })
    }

    const appError = handleError(error)
    return NextResponse.json({
      success: false,
      error: { message: appError.message }
    }, { status: 500 })
  }
}