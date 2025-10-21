import { NextRequest, NextResponse } from 'next/server'
import { getUserTelegramSettings, sendOrderNotification } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400 })
    }

    console.log('🧪 Testing Telegram notification for user:', userId)

    // Check user's Telegram settings
    const settings = await getUserTelegramSettings(userId)
    console.log('⚙️ User Telegram Settings:', settings)

    if (!settings?.telegramChatId) {
      return NextResponse.json({
        success: false,
        error: `User ${userId} does not have a Telegram chat ID configured`,
        settings
      })
    }

    // Test order notification
    const testOrderData = {
      externalOrderId: 'TEST-12345',
      customer: {
        name: 'Test Customer',
        email: 'test@example.com'
      },
      totalAmount: '99.99',
      status: 'paid',
      orderCreatedAt: new Date().toISOString(),
      items: [
        {
          productName: 'Test Product',
          quantity: 1,
          pricePerUnit: '99.99'
        }
      ],
      isUpdate: false
    }

    console.log('📱 Sending test notification...')
    const result = await sendOrderNotification(userId, testOrderData)
    console.log('📱 Notification result:', result)

    return NextResponse.json({
      success: true,
      message: 'Test completed',
      settings,
      result
    })

  } catch (error: any) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Telegram notification test endpoint - use POST with userId'
  })
}
