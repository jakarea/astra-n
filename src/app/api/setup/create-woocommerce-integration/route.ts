import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { userId, webhookSecret } = await request.json()

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400 })
    }

    // Check if WooCommerce integration already exists for this user
    const { data: existing } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'woocommerce')
      .single()

    if (existing) {
      // Update existing integration
      const { data, error } = await supabase
        .from('integrations')
        .update({
          webhook_secret: webhookSecret || existing.webhook_secret,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({
          error: 'Failed to update integration',
          details: error
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'WooCommerce integration updated',
        integration: data
      })
    }

    // Create new integration
    const { data, error } = await supabase
      .from('integrations')
      .insert([{
        user_id: userId,
        name: 'WooCommerce Store',
        type: 'woocommerce',
        domain: 'gohighleveln8n.com',
        webhook_secret: webhookSecret || '5d3eb562b96c8e0f9b1ca785b51aab41815a2dd15ec8fb3bfb5a00073e440604',
        is_active: true,
        status: 'active'
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create integration',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'WooCommerce integration created successfully',
      integration: data
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // List all WooCommerce integrations
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('type', 'woocommerce')

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch integrations',
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      integrations: data
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
