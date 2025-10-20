import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { testTelegramConnection } from '@/lib/telegram'

function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    return { token, supabase }
  } catch {
    return null
  }
}

async function requireAdmin(request: NextRequest) {
  const sessionInfo = getSessionFromRequest(request)
  if (!sessionInfo) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  const { supabase } = sessionInfo
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 }) }
  const { data: roleRow, error: roleError } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (roleError || !roleRow || roleRow.role !== 'admin') return { error: NextResponse.json({ error: 'Admin role required' }, { status: 403 }) }
  return { supabase }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const service = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await service
      .from('user_settings')
      .select('telegram_chat_id')
      .eq('user_id', id)
      .single()

    if (error && (error as any).code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        telegramChatId: data?.telegram_chat_id || null,
        isConfigured: !!data?.telegram_chat_id
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error
    const { id } = await params
    const { chatId, testConnection } = await request.json()

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
    }

    if (testConnection) {
      const testResult = await testTelegramConnection(chatId)
      if (!testResult.success) {
        return NextResponse.json({ error: `Connection test failed: ${testResult.error}` }, { status: 400 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const service = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await service
      .from('user_settings')
      .upsert({
        user_id: id,
        telegram_chat_id: chatId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (error) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: testConnection ? 'Telegram settings saved and test message sent successfully!' : 'Telegram settings saved successfully!',
      settings: { telegramChatId: chatId, isConfigured: true }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error
    const { id } = await params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const service = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await service
      .from('user_settings')
      .update({ telegram_chat_id: null, updated_at: new Date().toISOString() })
      .eq('user_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Telegram settings removed successfully' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}


