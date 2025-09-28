import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface TelegramMessage {
  text: string
  parse_mode?: 'HTML' | 'Markdown'
  disable_web_page_preview?: boolean
}

export interface UserTelegramSettings {
  telegramBotToken: string | null
  telegramChatId: string | null
}

export interface OrderNotification {
  orderNumber: string
  customerName: string
  customerEmail: string
  total: string
  currency: string
  status: string
  integration: string
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}

export async function getUserTelegramSettings(userId: string): Promise<UserTelegramSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.log('[TELEGRAM] No settings found for user:', userId)
      return null
    }

    return {
      telegramBotToken: data?.telegram_bot_token || null,
      telegramChatId: data?.telegram_chat_id || null
    }
  } catch (error) {
    console.error('[TELEGRAM] Error fetching user settings:', error)
    return null
  }
}

export async function sendTelegramNotification(
  userId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's telegram settings
    const settings = await getUserTelegramSettings(userId)

    if (!settings || !settings.telegramBotToken || !settings.telegramChatId) {
      console.log('[TELEGRAM] User has no telegram configuration:', userId)
      return { success: false, error: 'User has no telegram configuration' }
    }

    // Send message via Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`

    const payload: TelegramMessage = {
      text: message,
      parse_mode: parseMode,
      disable_web_page_preview: true
    }

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        ...payload
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[TELEGRAM] API Error:', result)
      return {
        success: false,
        error: result.description || 'Failed to send telegram message'
      }
    }

    console.log('[TELEGRAM] Message sent successfully to user:', userId)
    return { success: true }

  } catch (error: any) {
    console.error('[TELEGRAM] Error sending notification:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}

export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; error?: string; botInfo?: any }> {
  try {
    console.log('[TELEGRAM] Testing connection with chat ID:', chatId)
    console.log('[TELEGRAM] Bot token length:', botToken?.length || 0)

    // First, get bot info to verify token
    const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`
    console.log('[TELEGRAM] Testing bot info URL...')

    const botResponse = await fetch(botInfoUrl)
    const botResult = await botResponse.json()

    console.log('[TELEGRAM] Bot info response:', {
      ok: botResponse.ok,
      status: botResponse.status,
      result: botResult
    })

    if (!botResponse.ok) {
      console.error('[TELEGRAM] Bot info failed:', botResult)
      return {
        success: false,
        error: botResult.description || 'Invalid bot token'
      }
    }

    // Then, send a test message
    const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    console.log('[TELEGRAM] Sending test message...')

    const messageResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🤖 <b>Astra Notification Test</b>\n\nYour Telegram bot connection is working perfectly!',
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    })

    const messageResult = await messageResponse.json()

    console.log('[TELEGRAM] Message response:', {
      ok: messageResponse.ok,
      status: messageResponse.status,
      result: messageResult
    })

    if (!messageResponse.ok) {
      console.error('[TELEGRAM] Message send failed:', messageResult)
      return {
        success: false,
        error: messageResult.description || 'Failed to send test message'
      }
    }

    console.log('[TELEGRAM] Test message sent successfully!')
    return {
      success: true,
      botInfo: botResult.result
    }

  } catch (error: any) {
    console.error('[TELEGRAM] Network error:', error)
    return {
      success: false,
      error: error.message || 'Network error occurred'
    }
  }
}

// Helper functions for different notification types
export async function sendOrderNotification(userId: string, orderData: any) {
  console.log('[TELEGRAM] Preparing order notification for user:', userId)
  console.log('[TELEGRAM] Order data received:', JSON.stringify(orderData, null, 2))

  const itemsList = orderData.items?.map((item: any) =>
    `• ${item.productName} (x${item.quantity}) - $${item.pricePerUnit}`
  ).join('\n') || 'No items'

  const isUpdate = orderData.isUpdate || false
  const emoji = isUpdate ? '🔄' : '🛒'
  const title = isUpdate ? 'Order Updated!' : 'New Order Received!'

  const message = `
${emoji} <b>${title}</b>

📦 <b>Order ID:</b> ${orderData.externalOrderId}
👤 <b>Customer:</b> ${orderData.customer?.name || 'N/A'}
📧 <b>Email:</b> ${orderData.customer?.email || 'N/A'}
💰 <b>Total Amount:</b> $${orderData.totalAmount}
📊 <b>Status:</b> ${orderData.status}

<b>Items:</b>
${itemsList}

📅 <b>Order Date:</b> ${new Date(orderData.orderCreatedAt).toLocaleDateString()}
`

  console.log('[TELEGRAM] Prepared message:', message)
  const result = await sendTelegramNotification(userId, message)
  console.log('[TELEGRAM] Notification send result:', result)

  return result
}

export async function sendLeadNotification(userId: string, leadData: any) {
  const message = `
👤 <b>New Lead Created!</b>

<b>Name:</b> ${leadData.name || 'N/A'}
📧 <b>Email:</b> ${leadData.email || 'N/A'}
📱 <b>Phone:</b> ${leadData.phone || 'N/A'}
🔗 <b>Source:</b> ${leadData.source}
📊 <b>Status:</b> ${leadData.logisticStatus || 'Pending'}

📅 <b>Created:</b> ${new Date(leadData.createdAt).toLocaleDateString()}
`

  return await sendTelegramNotification(userId, message)
}

export async function sendWebhookChangeNotification(userId: string, changeData: any) {
  const message = `
🔄 <b>Webhook Update</b>

📝 <b>Type:</b> ${changeData.type}
📋 <b>Details:</b> ${changeData.details}
🔗 <b>Integration:</b> ${changeData.integration || 'N/A'}

⏰ <b>Time:</b> ${new Date().toLocaleString()}
`

  return await sendTelegramNotification(userId, message)
}