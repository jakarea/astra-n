import fs from 'fs'
import path from 'path'

interface WebhookLog {
  timestamp: string
  method: string
  url: string
  headers: Record<string, string | string[]>
  body: any
  query: Record<string, string | string[]>
  userAgent?: string
  contentType?: string
  contentLength?: number
  webhookSecret?: string
  integration?: any
  response?: {
    status: number
    message: string
    data?: any
  }
  error?: string
  processingTime?: number
}

class WebhookLogger {
  private logDir: string
  private logFile: string

  constructor() {
    // Simplified constructor - console only for now
    this.logDir = ''
    this.logFile = ''
  }

  private ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
    } catch (error) {
      // Ignore directory creation errors
    }
  }

  private sanitizeHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]> {
    const sanitized = { ...headers }

    // Sanitize sensitive headers but keep them identifiable
    if (sanitized['x-webhook-secret']) {
      const secret = Array.isArray(sanitized['x-webhook-secret'])
        ? sanitized['x-webhook-secret'][0]
        : sanitized['x-webhook-secret']
      sanitized['x-webhook-secret'] = `${secret.substring(0, 8)}...` + ` (length: ${secret.length})`
    }

    if (sanitized['x-wc-webhook-signature']) {
      const sig = Array.isArray(sanitized['x-wc-webhook-signature'])
        ? sanitized['x-wc-webhook-signature'][0]
        : sanitized['x-wc-webhook-signature']
      sanitized['x-wc-webhook-signature'] = `${sig.substring(0, 16)}...` + ` (length: ${sig.length})`
    }

    return sanitized
  }

  public logWebhookRequest(request: {
    method: string
    url: string
    headers: Record<string, string | string[]>
    body: any
    query?: Record<string, string | string[]>
  }): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const logEntry: WebhookLog = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      body: request.body,
      query: request.query || {},
      userAgent: Array.isArray(request.headers['user-agent'])
        ? request.headers['user-agent'][0]
        : request.headers['user-agent'],
      contentType: Array.isArray(request.headers['content-type'])
        ? request.headers['content-type'][0]
        : request.headers['content-type'],
      contentLength: request.headers['content-length']
        ? parseInt(Array.isArray(request.headers['content-length'])
          ? request.headers['content-length'][0]
          : request.headers['content-length'])
        : undefined
    }

    this.writeLog(`\n🔥 WEBHOOK REQUEST [${requestId}] ${logEntry.timestamp}`, logEntry)
    return requestId
  }

  public logWebhookProcessing(requestId: string, step: string, data: any = {}) {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
      step: step,
      ...data
    }

    if (logData.webhookSecret) {
      logData.webhookSecret = `${logData.webhookSecret.substring(0, 8)}... (length: ${logData.webhookSecret.length})`
    }

    this.writeLog(`📋 PROCESSING [${requestId}]`, logData)
  }

  public logWebhookResponse(requestId: string, response: {
    status: number
    message: string
    data?: any
    processingTime: number
  }) {
    this.writeLog(`✅ RESPONSE [${requestId}]`, {
      requestId,
      timestamp: new Date().toISOString(),
      ...response
    })
  }

  public logWebhookError(requestId: string, error: {
    message: string
    stack?: string
    status?: number
    processingTime?: number
  }) {
    this.writeLog(`❌ ERROR [${requestId}]`, {
      requestId,
      timestamp: new Date().toISOString(),
      ...error
    })
  }

  private writeLog(prefix: string, data: any) {
    try {
      // Create human-readable log format
      let logLine = `${prefix}\n`
      
      // Add timestamp
      logLine += `⏰ Time: ${new Date().toLocaleString()}\n`
      
      // Format data in human-readable way
      if (data.timestamp) {
        logLine += `📅 Timestamp: ${data.timestamp}\n`
      }
      if (data.method) {
        logLine += `🔗 Method: ${data.method}\n`
      }
      if (data.url) {
        logLine += `🌐 URL: ${data.url}\n`
      }
      if (data.status) {
        logLine += `📊 Status: ${data.status}\n`
      }
      if (data.message) {
        logLine += `💬 Message: ${data.message}\n`
      }
      if (data.error) {
        logLine += `❌ Error: ${data.error}\n`
      }
      if (data.processingTime) {
        logLine += `⏱️ Processing Time: ${data.processingTime}ms\n`
      }
      if (data.user_id) {
        logLine += `👤 User ID: ${data.user_id}\n`
      }
      if (data.order_id) {
        logLine += `📦 Order ID: ${data.order_id}\n`
      }
      if (data.customer_email) {
        logLine += `📧 Customer Email: ${data.customer_email}\n`
      }
      if (data.external_order_id) {
        logLine += `🆔 External Order ID: ${data.external_order_id}\n`
      }
      if (data.integration_id) {
        logLine += `🔌 Integration ID: ${data.integration_id}\n`
      }
      
      // Add any additional data
      const additionalData = { ...data }
      delete additionalData.timestamp
      delete additionalData.method
      delete additionalData.url
      delete additionalData.status
      delete additionalData.message
      delete additionalData.error
      delete additionalData.processingTime
      delete additionalData.user_id
      delete additionalData.order_id
      delete additionalData.customer_email
      delete additionalData.external_order_id
      delete additionalData.integration_id
      
      if (Object.keys(additionalData).length > 0) {
        logLine += `📋 Additional Data:\n${JSON.stringify(additionalData, null, 2)}\n`
      }
      
      logLine += `${'='.repeat(80)}\n`

      // Always console log for immediate debugging
      console.log(logLine)

      // Skip file operations for now to avoid Vercel issues
    } catch (error) {
      // Ignore logging errors
    }
  }

  public getLogFilePath(): string {
    return this.logFile
  }

  public getRecentLogs(lines: number = 100): string {
    // Return a simple message since we're not using file logging
    return 'Console-only logging enabled. Check Vercel function logs for webhook details.'
  }

  public clearLogs() {
    // No-op since we're not using file logging
  }

  // Simple log method for general logging
  public log(...args: any[]) {
    try {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')

      const logLine = `${new Date().toISOString()} - ${message}\n`

      // Always console log for immediate debugging
      console.log(logLine)
    } catch (error) {
      // Ignore logging errors
    }
  }
}

export const webhookLogger = new WebhookLogger()