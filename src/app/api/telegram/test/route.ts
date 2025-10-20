import { NextRequest, NextResponse } from 'next/server'
import { testTelegramConnection } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [/api/telegram/test] Request received')

    const contentType = request.headers.get('content-type') || ''
    console.log('📋 Content-Type:', contentType)

    let body: any = {}
    try {
      body = await request.json()
    } catch (e: any) {
      console.log('❌ Failed to parse JSON body:', e?.message)
    }

    const chatId = body?.chatId
    console.log('📱 Chat ID:', chatId)

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    console.log('🤖 Has TELEGRAM_BOT_TOKEN:', !!botToken, ' length:', botToken ? botToken.length : 0)

    if (!chatId) {
      console.log('❌ chatId missing in request body')
      return NextResponse.json({ success: false, error: 'chatId is required' }, { status: 400 })
    }

    if (!botToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN missing in environment')
      return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
    }

    console.log('🧪 Testing Telegram connection...')
    const result = await testTelegramConnection(chatId)
    console.log('🧪 Test result:', result)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to send test message' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Test message sent successfully!', botInfo: result.botInfo })
  } catch (error: any) {
    console.log('❌ [/api/telegram/test] Exception:', error?.message, error?.stack)
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status: 500 })
  }
}


