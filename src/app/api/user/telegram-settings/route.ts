import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { testTelegramConnection } from '@/lib/telegram'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    const url = new URL(request.url)
    const userIdParam = url.searchParams.get('userId')
    // Public read if userId is explicitly provided via query; otherwise require auth
    const user = userIdParam ? { id: userIdParam } as any : await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required or provide userId param' }, { status: 401 })
    }
    const { data, error } = await supabase
      .from('user_settings')
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        telegramChatId: data?.telegram_chat_id || null,
        isConfigured: !!data?.telegram_chat_id
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Update user's Telegram settings
export async function POST(request: NextRequest) {
  try {
    const { chatId, testConnection, userId } = await request.json()

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    // If testConnection=true → allow public test without persisting settings
    if (testConnection) {
      const testResult = await testTelegramConnection(chatId)
      if (!testResult.success) {
        return NextResponse.json({ error: `Connection test failed: ${testResult.error}` }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        message: 'Telegram test successful. Settings not persisted in public test mode.'
      })
    }

    // Persisting settings requires authenticated user (or explicit userId)
    const authedUser = userId ? { id: userId } as any : await getSessionUser(request)
    if (!authedUser) {
      return NextResponse.json({ error: 'Authentication required to save settings' }, { status: 401 })
    }

    // Upsert user settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: authedUser.id,
        telegram_chat_id: chatId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Telegram settings saved successfully!',
      settings: {
        telegramChatId: chatId,
        isConfigured: true
      }
    })

  } catch (error: any) {
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
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        telegram_chat_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()

    if (error) {
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}