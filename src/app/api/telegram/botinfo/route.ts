import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('🤖 BOT INFO REQUEST RECEIVED')
  
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  console.log('🤖 Bot token exists:', !!botToken)
  console.log('🤖 Bot token length:', botToken ? botToken.length : 0)

  if (!botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN not found in environment')
    return NextResponse.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN not found in environment variables',
      debug: {
        hasToken: false,
        tokenLength: 0
      }
    })
  }

  try {
    console.log('🤖 Fetching bot info from Telegram API...')
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await response.json()
    
    console.log('🤖 Telegram API response:', data)
    
    if (data.ok) {
      console.log('✅ Bot info retrieved successfully')
      return NextResponse.json({
        success: true,
        botInfo: {
          id: data.result.id,
          first_name: data.result.first_name,
          username: data.result.username,
          can_join_groups: data.result.can_join_groups,
          can_read_all_group_messages: data.result.can_read_all_group_messages,
          supports_inline_queries: data.result.supports_inline_queries
        },
        debug: {
          hasToken: true,
          tokenLength: botToken.length,
          apiResponse: data
        }
      })
    } else {
      console.log('❌ Invalid bot token:', data.description)
      return NextResponse.json({
        success: false,
        error: data.description || 'Invalid bot token',
        debug: {
          hasToken: true,
          tokenLength: botToken.length,
          apiResponse: data
        }
      })
    }
  } catch (error: any) {
    console.log('❌ Bot info fetch error:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message,
      debug: {
        hasToken: true,
        tokenLength: botToken.length,
        error: error.message
      }
    })
  }
}