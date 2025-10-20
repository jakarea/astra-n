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
    try {
      // Use a temp directory that works both locally and in production
      this.logDir = process.env.NODE_ENV === 'production'
        ? '/tmp/webhook-logs'
        : path.join(process.cwd(), 'logs')

      this.logFile = path.join(this.logDir, `webhook-debug-${new Date().toISOString().split('T')[0]}.log`)
      this.ensureLogDirectory()
    } catch (error) {
      // Fallback to console-only logging
      this.logDir = ''
      this.logFile = ''
    }
  }

  private ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
    } catch (error) {    }
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

  public logWebhookProcessing(requestId: string, data: {
    webhookSecret?: string
    integration?: any
    processing?: string
  }) {
    const logData = {
      requestId,
      timestamp: new Date().toISOString(),
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
      const logLine = `${prefix}\n${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`

      // Always console log for immediate debugging
      console.log(logLine)

      // Try to write to file if possible
      if (this.logFile) {
        try {
          fs.appendFileSync(this.logFile, logLine, 'utf8')
        } catch (fileError) {        }
      }

    } catch (error) {    }
  }

  public getLogFilePath(): string {
    return this.logFile
  }

  public getRecentLogs(lines: number = 100): string {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf8')
        return content.split('\n').slice(-lines).join('\n')
      }
      return 'No logs found'
    } catch (error) {
    return `Error reading logs: ${error.message}`
    }
  }

  public clearLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile)      }
    } catch (error) {    }
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

      // Try to write to file if possible
      if (this.logFile) {
        try {
          fs.appendFileSync(this.logFile, logLine, 'utf8')
        } catch (fileError) {
          // Ignore file write errors
        }
      }
    } catch (error) {
      // Ignore logging errors
    }
  }
}

export const webhookLogger = new WebhookLogger()