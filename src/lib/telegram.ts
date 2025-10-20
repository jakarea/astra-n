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
      .select('telegram_chat_id')
      .eq('user_id', userId)
      .single()

    if (error) {
      return null
    }

    return {
      telegramChatId: data?.telegram_chat_id || null
    }
  } catch (error) {
    return null
  }
}

export async function sendTelegramNotification(
  userId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  retryCount: number = 0
): Promise<{ success: boolean; error?: string }> {
  const maxRetries = 3
  const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff

  try {
    // Get bot token from environment variable
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return {
        success: false,
        error: 'Missing TELEGRAM_BOT_TOKEN in environment variables'
      }
    }

    // Get user's telegram chat ID from settings
    const settings = await getUserTelegramSettings(userId)
    const chatId = settings?.telegramChatId

    if (!chatId) {
      return {
        success: false,
        error: `User ${userId} does not have a Telegram chat ID configured`
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
        chat_id: chatId,
        ...payload
      })
    })

    const result = await response.json()

    if (!response.ok) {
      // Retry on temporary failures
      if (retryCount < maxRetries && (
        response.status === 429 || // Rate limited
        response.status >= 500 || // Server errors
        result.error_code === 5 || // Internal server error
        result.error_code === 6 || // Too many requests
        result.error_code === 14 // Flood control
      )) {
        console.log(`Telegram notification retry ${retryCount + 1}/${maxRetries} for user ${userId}, waiting ${retryDelay}ms`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return sendTelegramNotification(userId, message, parseMode, retryCount + 1)
      }

      return {
        success: false,
        error: result.description || 'Failed to send telegram message'
      }
    }

    return { success: true }

  } catch (error: any) {
    // Retry on network errors
    if (retryCount < maxRetries && (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('fetch')
    )) {
      console.log(`Telegram notification network retry ${retryCount + 1}/${maxRetries} for user ${userId}, waiting ${retryDelay}ms`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return sendTelegramNotification(userId, message, parseMode, retryCount + 1)
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
  }
}

export async function testTelegramConnection(
  chatId: string
): Promise<{ success: boolean; error?: string; botInfo?: any }> {
  try {
    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return {
        success: false,
        error: 'Missing TELEGRAM_BOT_TOKEN in environment variables'
      }
    }

    // First, get bot info to verify token
    const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`
    const botResponse = await fetch(botInfoUrl)
    const botResult = await botResponse.json()

    if (!botResponse.ok) {
      return {
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

    if (!messageResponse.ok) {
      return {
        success: false,
        error: messageResult.description || 'Failed to send test message'
      }
    }

    return {
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
export async function sendOrderNotification(userId: string, orderData: any) {
  console.log('🤖 SENDING TELEGRAM NOTIFICATION')
  console.log('👤 User ID:', userId)
  console.log('📦 Order Data:', JSON.stringify(orderData, null, 2))
  
  // Check if user has any Telegram configuration
  const settings = await getUserTelegramSettings(userId)
  console.log('⚙️ Telegram Settings:', settings)
  
  if (!settings?.telegramChatId) {
    console.log('❌ No Telegram chat ID configured for user:', userId)
    return {
      success: false,
      error: `User ${userId} does not have a Telegram chat ID configured`
    }
  }
  
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
  
  console.log('📱 Telegram Message:', message)
  const result = await sendTelegramNotification(userId, message)
  console.log('📱 Telegram Result:', result)
  
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