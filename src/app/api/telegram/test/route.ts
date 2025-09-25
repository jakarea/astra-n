import { NextRequest, NextResponse } from 'next/server'
import { TelegramService } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  console.log('[TELEGRAM_TEST] API endpoint called')

  try {
    let body
    try {
      body = await request.json()
      console.log('[TELEGRAM_TEST] Request body:', { chatId: body?.chatId ? 'PROVIDED' : 'MISSING' })
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

    const { chatId } = body

    if (!chatId) {
      console.log('[TELEGRAM_TEST] Missing chat ID in request')
      return NextResponse.json(
        {
          success: false,
          error: 'Chat ID is required'
        },
        { status: 400 }
      )
    }

    console.log('[TELEGRAM_TEST] Processing test for chat ID:', chatId)

    const telegramService = new TelegramService()
    const result = await telegramService.testConnection(chatId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send test message. Please check your chat ID and bot configuration.'
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