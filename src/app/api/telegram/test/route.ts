import { NextRequest, NextResponse } from 'next/server'
import { testTelegramConnection } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  console.log('[TELEGRAM_TEST] API endpoint called')

  try {
    let body
    try {
      body = await request.json()
      console.log('[TELEGRAM_TEST] Request body:', {
        chatId: body?.chatId ? 'PROVIDED' : 'MISSING',
        botToken: body?.botToken ? 'PROVIDED' : 'MISSING'
      })
    } catch (parseError) {
      console.error('[TELEGRAM_TEST] JSON parse error:', parseError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      )
    }

    const { chatId, botToken } = body

    if (!chatId) {
      console.log('[TELEGRAM_TEST] Missing chat ID')
      return NextResponse.json(
        {
          success: false,
          error: 'Chat ID is required'
        },
        { status: 400 }
      )
    }

    // Use provided botToken or fallback to environment variable
    const tokenToUse = botToken || process.env.TELEGRAM_BOT_TOKEN

    if (!tokenToUse) {
      console.log('[TELEGRAM_TEST] No bot token available')
      return NextResponse.json(
        {
          success: false,
          error: 'Bot token is required. Either provide it in the request or set TELEGRAM_BOT_TOKEN environment variable.'
        },
        { status: 400 }
      )
    }

    console.log('[TELEGRAM_TEST] Testing connection with bot token:', tokenToUse ? 'PROVIDED' : 'MISSING')

    const result = await testTelegramConnection(tokenToUse, chatId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully!',
        botInfo: result.botInfo
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test message. Please check your bot token and chat ID.'
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Telegram test error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Only POST method is supported for testing Telegram connection'
    },
    { status: 405 }
  )
}