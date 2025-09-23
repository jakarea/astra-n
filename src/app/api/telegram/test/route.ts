import { NextRequest, NextResponse } from 'next/server'
import { TelegramNotificationService } from '@/lib/telegram'

/**
 * Test Telegram notification endpoint
 * POST /api/telegram/test
 */
export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json()

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    // Test the connection
    const success = await TelegramNotificationService.testConnection(chatId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Telegram test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}