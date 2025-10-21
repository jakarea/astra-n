import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔍 Checking users and Telegram settings...')

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersError
      }, { status: 500 })
    }

    console.log('👥 Found users:', users?.length || 0)

    // Get all user settings with Telegram chat IDs
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_settings')
      .select('user_id, telegram_chat_id')

    if (settingsError) {
      console.error('❌ Error fetching settings:', settingsError)
      return NextResponse.json({
        error: 'Failed to fetch settings',
        details: settingsError
      }, { status: 500 })
    }

    console.log('⚙️ Found settings:', settings?.length || 0)

    // Get all Shopify integrations
    const { data: integrations, error: integrationsError } = await supabaseAdmin
      .from('integrations')
      .select('id, user_id, name, domain, type, is_active, admin_access_token')
      .eq('type', 'shopify')

    if (integrationsError) {
      console.error('❌ Error fetching integrations:', integrationsError)
      return NextResponse.json({
        error: 'Failed to fetch integrations',
        details: integrationsError
      }, { status: 500 })
    }

    console.log('🔗 Found Shopify integrations:', integrations?.length || 0)

    // Combine data
    const userData = users?.map(user => {
      const userSettings = settings?.find(s => s.user_id === user.id)
      const userIntegrations = integrations?.filter(i => i.user_id === user.id)
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        telegramChatId: userSettings?.telegram_chat_id || null,
        hasTelegramSettings: !!userSettings?.telegram_chat_id,
        integrations: userIntegrations || []
      }
    }) || []

    return NextResponse.json({
      success: true,
      summary: {
        totalUsers: users?.length || 0,
        usersWithTelegram: userData.filter(u => u.hasTelegramSettings).length,
        totalShopifyIntegrations: integrations?.length || 0,
        activeShopifyIntegrations: integrations?.filter(i => i.is_active).length || 0
      },
      users: userData
    })

  } catch (error: any) {
    console.error('❌ Check error:', error)
    return NextResponse.json({
      error: 'Check failed',
      message: error.message
    }, { status: 500 })
  }
}
