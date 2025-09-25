import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  console.log('[TELEGRAM_BOT_INFO] Checking bot token validity')

  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return NextResponse.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN not found in environment variables'
    })
  }

  try {
    console.log('[TELEGRAM_BOT_INFO] Bot token length:', botToken.length)
    console.log('[TELEGRAM_BOT_INFO] Bot token format check:', /^\d+:[A-Za-z0-9_-]+$/.test(botToken))

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await response.json()

    console.log('[TELEGRAM_BOT_INFO] Telegram API response:', data)

    if (data.ok) {
      return NextResponse.json({
        success: true,
        botInfo: {
          id: data.result.id,
          first_name: data.result.first_name,
          username: data.result.username,
          can_join_groups: data.result.can_join_groups,
          can_read_all_group_messages: data.result.can_read_all_group_messages,
          supports_inline_queries: data.result.supports_inline_queries
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.description || 'Invalid bot token'
      })
    }
  } catch (error: any) {
    console.error('[TELEGRAM_BOT_INFO] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}