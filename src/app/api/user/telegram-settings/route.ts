import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { testTelegramConnection } from '@/lib/telegram'
import { getSessionUser } from '@/lib/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET - Get user's current Telegram settings
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('[TELEGRAM_SETTINGS] Fetching settings for user:', user.id)

    const { data, error } = await supabase
      .from('user_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[TELEGRAM_SETTINGS] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        telegramBotToken: data?.telegram_bot_token ? '***CONFIGURED***' : null,
        telegramChatId: data?.telegram_chat_id || null,
        isConfigured: !!(data?.telegram_bot_token && data?.telegram_chat_id)
      }
    })

  } catch (error: any) {
    console.error('[TELEGRAM_SETTINGS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Update user's Telegram settings
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { botToken, chatId, testConnection } = await request.json()

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'Bot token and chat ID are required' },
        { status: 400 }
      )
    }

    console.log('[TELEGRAM_SETTINGS] Updating settings for user:', user.id)

    // Test connection if requested
    if (testConnection) {
      console.log('[TELEGRAM_SETTINGS] Testing telegram connection...')
      const testResult = await testTelegramConnection(botToken, chatId)

      if (!testResult.success) {
        return NextResponse.json(
          { error: `Connection test failed: ${testResult.error}` },
          { status: 400 }
        )
      }
    }

    // Upsert user settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        telegram_bot_token: botToken,
        telegram_chat_id: chatId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[TELEGRAM_SETTINGS] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    console.log('[TELEGRAM_SETTINGS] Settings updated successfully for user:', user.id)

    return NextResponse.json({
      success: true,
      message: testConnection ?
        'Telegram settings saved and test message sent successfully!' :
        'Telegram settings saved successfully!',
      settings: {
        telegramBotToken: '***CONFIGURED***',
        telegramChatId: chatId,
        isConfigured: true
      }
    })

  } catch (error: any) {
    console.error('[TELEGRAM_SETTINGS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove user's Telegram settings
export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('[TELEGRAM_SETTINGS] Removing settings for user:', user.id)

    const { data, error } = await supabase
      .from('user_settings')
      .update({
        telegram_bot_token: null,
        telegram_chat_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('[TELEGRAM_SETTINGS] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to remove settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram settings removed successfully'
    })

  } catch (error: any) {
    console.error('[TELEGRAM_SETTINGS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}