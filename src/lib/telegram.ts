interface TelegramMessage {
  chat_id: string
  text: string
  parse_mode?: 'HTML' | 'Markdown'
  disable_web_page_preview?: boolean
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

export class TelegramService {
  private botToken: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN!

    console.log('[TELEGRAM] Bot token status:', this.botToken ? 'LOADED' : 'MISSING')

    if (!this.botToken) {
      console.error('[TELEGRAM] TELEGRAM_BOT_TOKEN environment variable is missing')
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required')
    }
  }

  async sendMessage(chatId: string, message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[TELEGRAM] Attempting to send message to chat:', chatId)

      const telegramMessage: TelegramMessage = {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      }

      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`
      console.log('[TELEGRAM] API URL:', url.replace(this.botToken, 'TOKEN_HIDDEN'))

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(telegramMessage),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('[TELEGRAM] API error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        })

        let errorMessage = 'Unknown error'
        if (responseData.description) {
          errorMessage = responseData.description
        } else if (response.status === 401) {
          errorMessage = 'Invalid bot token'
        } else if (response.status === 400) {
          errorMessage = 'Invalid chat ID or message format'
        }

        return { success: false, error: errorMessage }
      }

      console.log('[TELEGRAM] Message sent successfully to chat:', chatId)
      return { success: true }
    } catch (error: any) {
      console.error('[TELEGRAM] Network or other error:', error)
      return { success: false, error: error.message || 'Network error occurred' }
    }
  }

  formatOrderNotification(order: OrderNotification): string {
    const itemsList = order.items
      .map(item => `• ${item.name} (x${item.quantity}) - ${order.currency}${item.price}`)
      .join('\n')

    return `
🛍️ <b>New Order Received!</b>

📦 <b>Order #:</b> ${order.orderNumber}
👤 <b>Customer:</b> ${order.customerName}
📧 <b>Email:</b> ${order.customerEmail}
💰 <b>Total:</b> ${order.currency}${order.total}
📊 <b>Status:</b> ${order.status}
🔗 <b>From:</b> ${order.integration}

<b>Items:</b>
${itemsList}

<i>Order processed successfully via webhook</i>
    `.trim()
  }

  async sendOrderNotification(chatId: string, order: OrderNotification): Promise<{ success: boolean; error?: string }> {
    const message = this.formatOrderNotification(order)
    return await this.sendMessage(chatId, message, 'HTML')
  }

  async testConnection(chatId: string): Promise<{ success: boolean; error?: string }> {
    const testMessage = `
🤖 <b>Telegram Bot Test</b>

✅ Connection successful!
📅 ${new Date().toLocaleString()}

Your Telegram notifications are now configured and working properly.
    `.trim()

    return await this.sendMessage(chatId, testMessage, 'HTML')
  }
}