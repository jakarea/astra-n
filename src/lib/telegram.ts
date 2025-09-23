/**
 * Telegram notification utility for sending notifications to users
 */

interface TelegramMessage {
  chatId: string
  message: string
}

interface NewLeadNotification {
  leadId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  orderValue: number
  source: string
  timestamp: string
}

export class TelegramNotificationService {
  private static botToken = process.env.TELEGRAM_BOT_TOKEN

  /**
   * Send a message to a Telegram chat
   */
  static async sendMessage(chatId: string, message: string): Promise<boolean> {
    if (!this.botToken) {
      console.warn('Telegram bot token not configured')
      return false
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      })

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Failed to send Telegram message:', error)
      return false
    }
  }

  /**
   * Format and send a new lead notification
   */
  static async sendNewLeadNotification(
    chatId: string,
    lead: NewLeadNotification
  ): Promise<boolean> {
    const message = this.formatNewLeadMessage(lead)
    return this.sendMessage(chatId, message)
  }

  /**
   * Format a new lead message
   */
  private static formatNewLeadMessage(lead: NewLeadNotification): string {
    const emoji = '🎯'
    const moneyEmoji = '💰'
    const timeEmoji = '⏰'
    const phoneEmoji = '📱'
    const emailEmoji = '📧'
    const sourceEmoji = '🏪'

    return `${emoji} <b>Nuovo Lead Ricevuto!</b>

<b>Cliente:</b> ${lead.customerName}
${emailEmoji} <b>Email:</b> ${lead.customerEmail}${lead.customerPhone ? `\n${phoneEmoji} <b>Telefono:</b> ${lead.customerPhone}` : ''}

${moneyEmoji} <b>Valore Ordine:</b> €${lead.orderValue.toFixed(2)}
${sourceEmoji} <b>Fonte:</b> ${lead.source}
${timeEmoji} <b>Data:</b> ${new Date(lead.timestamp).toLocaleString('it-IT')}

<b>ID Lead:</b> <code>#${lead.leadId}</code>

🚀 <i>Accedi ad Astra per gestire questo lead!</i>`
  }

  /**
   * Send order status update notification
   */
  static async sendOrderStatusUpdate(
    chatId: string,
    orderId: string,
    customerName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<boolean> {
    const statusEmojis: Record<string, string> = {
      pending: '⏳',
      processing: '🔄',
      shipped: '🚚',
      delivered: '✅',
      cancelled: '❌'
    }

    const emoji = statusEmojis[newStatus] || '📦'

    const message = `${emoji} <b>Aggiornamento Ordine</b>

<b>Ordine:</b> <code>#${orderId}</code>
<b>Cliente:</b> ${customerName}

<b>Stato:</b> ${oldStatus} → <b>${newStatus}</b>

⏰ <b>Aggiornato:</b> ${new Date().toLocaleString('it-IT')}`

    return this.sendMessage(chatId, message)
  }

  /**
   * Test telegram connection
   */
  static async testConnection(chatId: string): Promise<boolean> {
    const message = `🔔 <b>Test Notifiche Astra</b>

✅ Le notifiche Telegram sono configurate correttamente!

Riceverai notifiche per:
• Nuovi lead
• Aggiornamenti ordini
• Altri eventi importanti

⏰ <i>Test inviato il ${new Date().toLocaleString('it-IT')}</i>`

    return this.sendMessage(chatId, message)
  }
}

/**
 * Get user's Telegram settings from database or localStorage
 */
export async function getUserTelegramSettings(userEmail: string): Promise<{
  chatId?: string
  notificationsEnabled: boolean
}> {
  // For static prototype, use localStorage
  if (typeof window !== 'undefined') {
    const chatId = localStorage.getItem(`telegram_chat_id_${userEmail}`)
    const notificationsEnabled = localStorage.getItem(`telegram_notifications_${userEmail}`) === 'true'

    return {
      chatId: chatId || undefined,
      notificationsEnabled
    }
  }

  // In production, this would query the database
  return { notificationsEnabled: false }
}

/**
 * Send notification to all users with Telegram enabled for a specific event
 */
export async function notifyUsersOfNewLead(lead: NewLeadNotification): Promise<void> {
  // For prototype, we'll simulate sending to all users who have Telegram configured
  // In production, this would query the database for users with telegram notifications enabled

  console.log('Sending Telegram notification for new lead:', lead)

  // This would be replaced with actual database query in production
  const usersWithTelegram = [
    // Example users who have Telegram configured
  ]

  for (const user of usersWithTelegram) {
    try {
      await TelegramNotificationService.sendNewLeadNotification(user.chatId, lead)
    } catch (error) {
      console.error(`Failed to send notification to user ${user.email}:`, error)
    }
  }
}