import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCrmTagSchema } from '@/lib/validations'
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

// GET - Fetch all CRM tags
export async function GET(request: NextRequest) {
  try {
    // Get tags from database
    const { data: tags, error } = await supabase
      .from('crm_tags')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: tags || []
    })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json(
      { success: false, error: appError },
      { status: 500 }
    )
  }
}

// POST - Create new CRM tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate and sanitize input
    const validation = validateAndSanitize(
      body,
      createCrmTagSchema,
      {
        name: (value: string) => value.trim().toLowerCase()
      }
    )

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validation.errors.join(', ') } },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Check if tag already exists
    const { data: existingTag, error: checkError } = await supabase
      .from('crm_tags')
      .select('id')
      .eq('name', validatedData.name)
      .single()

    if (existingTag) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_TAG', message: 'Tag already exists' } },
        { status: 409 }
      )
    }

    // Insert tag into database
    const { data: tag, error: insertError } = await supabase
      .from('crm_tags')
      .insert([{
        name: validatedData.name,
        color: validatedData.color || '#3ECF8E'
      }])
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create tag: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: tag,
      message: 'Tag created successfully'
    }, { status: 201 })

  } catch (error) {
    const appError = handleError(error)
    return NextResponse.json(
      { success: false, error: appError },
      { status: 500 }
    )
  }
}