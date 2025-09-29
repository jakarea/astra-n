'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Trash2, Download, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'

interface LogEntry {
  type: 'REQUEST' | 'PROCESSING' | 'RESPONSE' | 'ERROR'
  timestamp: string
  requestId?: string
  content: string
  data?: any
}

export default function WebhookDebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/webhook-debug/logs')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      const parsedLogs: LogEntry[] = data.logs.map((log: string) => {
        const lines = log.split('\n')
        const firstLine = lines[0]

        let type: LogEntry['type'] = 'REQUEST'
        let timestamp = ''
        let requestId = ''

        if (firstLine.includes('🔥 WEBHOOK REQUEST')) {
          type = 'REQUEST'
          const match = firstLine.match(/\[([^\]]+)\]\s*(.+)/)
          if (match) {
            requestId = match[1]
            timestamp = match[2]
          }
        } else if (firstLine.includes('📋 PROCESSING')) {
          type = 'PROCESSING'
          const match = firstLine.match(/\[([^\]]+)\]/)
          if (match) requestId = match[1]
        } else if (firstLine.includes('✅ RESPONSE')) {
          type = 'RESPONSE'
          const match = firstLine.match(/\[([^\]]+)\]/)
          if (match) requestId = match[1]
        } else if (firstLine.includes('❌ ERROR')) {
          type = 'ERROR'
          const match = firstLine.match(/\[([^\]]+)\]/)
          if (match) requestId = match[1]
        }

        let data = null
        try {
          const jsonContent = lines.slice(1).join('\n')
          data = JSON.parse(jsonContent)
          timestamp = data.timestamp || timestamp
        } catch (e) {
          // Not JSON, keep as text
        }

        return {
          type,
          timestamp,
          requestId,
          content: log,
          data
        }
      })

      setLogs(parsedLogs)

    } catch (error: any) {
      console.error('Failed to fetch logs:', error)
      toast.error(`Failed to fetch logs: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/webhook-debug/logs', { method: 'DELETE' })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      setLogs([])
      toast.success('Logs cleared successfully')

    } catch (error: any) {
      console.error('Failed to clear logs:', error)
      toast.error(`Failed to clear logs: ${error.message}`)
    }
  }

  const downloadLogs = async () => {
    try {
      const response = await fetch('/api/webhook-debug/logs?format=text')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `webhook-debug-${new Date().toISOString().split('T')[0]}.log`
      a.click()

      URL.revokeObjectURL(url)
      toast.success('Log file downloaded')

    } catch (error: any) {
      console.error('Failed to download logs:', error)
      toast.error(`Failed to download logs: ${error.message}`)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return <Zap className="h-4 w-4" />
      case 'PROCESSING': return <Clock className="h-4 w-4" />
      case 'RESPONSE': return <CheckCircle className="h-4 w-4" />
      case 'ERROR': return <AlertCircle className="h-4 w-4" />
    }
  }

  const getLogBadge = (type: LogEntry['type']) => {
    switch (type) {
      case 'REQUEST': return <Badge variant="outline" className="bg-blue-50">REQUEST</Badge>
      case 'PROCESSING': return <Badge variant="outline" className="bg-yellow-50">PROCESSING</Badge>
      case 'RESPONSE': return <Badge variant="outline" className="bg-green-50">RESPONSE</Badge>
      case 'ERROR': return <Badge variant="destructive">ERROR</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Debug Logs</h1>
          <p className="text-muted-foreground">
            Real-time debugging information for WooCommerce webhook integration
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={downloadLogs}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="destructive" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['REQUEST', 'PROCESSING', 'RESPONSE', 'ERROR'] as const).map((type) => {
          const count = logs.filter(log => log.type === type).length
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{type}</CardTitle>
                {getLogIcon(type)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {type.toLowerCase()} entries
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Activity</CardTitle>
          <CardDescription>
            {logs.length === 0
              ? 'No webhook activity recorded yet. Trigger a webhook to see logs here.'
              : `Showing ${logs.length} log entries (most recent first)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No webhook logs available</p>
                <p className="text-sm mt-2">Send a test webhook to see activity here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getLogIcon(log.type)}
                        {getLogBadge(log.type)}
                        {log.requestId && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.requestId}
                          </Badge>
                        )}
                      </div>
                      {log.timestamp && (
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono">
                      {log.content}
                    </pre>

                    {log.data && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View parsed data
                          </summary>
                          <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">How to Use This Debug Tool</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>**Set up your WooCommerce webhook** with your endpoint URL</li>
            <li>**Send a test webhook** from WooCommerce or use the test script</li>
            <li>**Check the logs above** - they will show the complete request flow</li>
            <li>**Look for ERROR entries** - these will show you what's wrong</li>
            <li>**Enable auto-refresh** to monitor webhooks in real-time</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="font-medium">Your webhook endpoint:</p>
            <code className="text-xs">https://astra-n.vercel.app/api/webhook/woocommerce-order-integration</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}