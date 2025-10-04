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

    if (error) {      return null
    }

    return {
      telegramBotToken: data?.telegram_bot_token || null,
      telegramChatId: data?.telegram_chat_id || null
    }
  } catch (error) {
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

    // Use user settings if available, otherwise fallback to environment variables
    let botToken = settings?.telegramBotToken
    let chatId = settings?.telegramChatId

    // Fallback to environment variables if user doesn't have individual settings
    if (!botToken) {
      botToken = process.env.TELEGRAM_BOT_TOKEN    }

    if (!chatId) {
      chatId = settings?.telegramChatId // Still try to get chat ID from user settings
    }

    if (!botToken || !chatId) {      return {
        success: false,
        error: `Missing Telegram configuration. Bot token: ${!!botToken}, Chat ID: ${!!chatId}`
      }
    }

    // Send message via Telegram Bot API
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
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

    if (!response.ok) {      return {
        success: false,
        error: result.description || 'Failed to send telegram message'
      }
    }    return { success: true }

  } catch (error: any) {
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
    // First, get bot info to verify token
        const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`
        const botResponse = await fetch(botInfoUrl)
    const botResult = await botResponse.json()
    if (!botResponse.ok) {      return {
        success: false,
        error: botResult.description || 'Invalid bot token'
      }
    }

    // Then, send a test message
        const messageUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
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
    if (!messageResponse.ok) {      return {
        success: false,
        error: messageResult.description || 'Failed to send test message'
      }
    }    return {
      success: true,
      botInfo: botResult.result
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred'
    }
  }
}

// Helper functions for different notification types
export async function sendOrderNotification(userId: string, orderData: any) {)

  // Check if user has any Telegram configuration
        const settings = await getUserTelegramSettings(userId)
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
  const result = await sendTelegramNotification(userId, message)
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