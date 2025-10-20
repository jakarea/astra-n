import { NextRequest, NextResponse } from 'next/server'
import { testTelegramConnection } from '@/lib/telegram'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TELEGRAM TEST REQUEST RECEIVED')
    
    const user = await getSessionUser(request)

    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('👤 Authenticated user:', user.id)

    const { chatId } = await request.json()
    console.log('📱 Chat ID received:', chatId)

    if (!chatId) {
      console.log('❌ No chat ID provided')
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    // Check if bot token exists
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    console.log('🤖 Bot token exists:', !!botToken)
    console.log('🤖 Bot token length:', botToken ? botToken.length : 0)

    if (!botToken) {
      console.log('❌ TELEGRAM_BOT_TOKEN not found in environment')
      return NextResponse.json(
        { 
          success: false,
          error: 'TELEGRAM_BOT_TOKEN not configured in environment variables'
        },
        { status: 500 }
      )
    }

    console.log('🧪 Testing Telegram connection...')
    
    // Test the Telegram connection
    const testResult = await testTelegramConnection(chatId)
    console.log('🧪 Test result:', testResult)

    if (testResult.success) {
      console.log('✅ Telegram test successful')
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully! Check your Telegram.',
        botInfo: testResult.botInfo
      })
    } else {
      console.log('❌ Telegram test failed:', testResult.error)
      return NextResponse.json(
        { 
          success: false,
          error: testResult.error || 'Failed to send test message'
        },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.log('❌ Telegram test exception:', error.message)
    console.log('❌ Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
