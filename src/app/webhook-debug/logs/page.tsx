'use client'

import { useState, useEffect } from 'react'
import { getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Trash2, FileText, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LogData {
  success: boolean
  logs: string
  logFilePath: string
  totalLines: number
}

export default function WebhookLogsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [logData, setLogData] = useState<LogData | null>(null)

  useEffect(() => {
    if (!isAdmin()) {
      setHasError(true)
      setErrorMessage('Access denied. Admin role required.')
      setLoading(false)
      return
    }

    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/webhook-debug/logs', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setLogData(data)
      setHasError(false)
    } catch (error: any) {
      setHasError(true)
      setErrorMessage(`Failed to load logs: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const refreshLogs = async () => {
    setRefreshing(true)
    try {
      await loadLogs()
      toast.success('Logs refreshed successfully')
    } catch (error: any) {
      toast.error(`Failed to refresh logs: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all webhook logs? This action cannot be undone.')) {
      return
    }

    setClearing(true)
    try {
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/webhook-debug/logs', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      toast.success(data.message || 'Logs cleared successfully')
      await loadLogs()
    } catch (error: any) {
      toast.error(`Failed to clear logs: ${error.message}`)
    } finally {
      setClearing(false)
    }
  }

  const formatLogs = (logs: string) => {
    if (!logs || logs === 'No logs found') {
      return 'No webhook logs available'
    }

    // Split logs into individual entries and format them
    const logEntries = logs.split('='.repeat(80))
    return logEntries
      .filter(entry => entry.trim())
      .map((entry, index) => {
        const lines = entry.trim().split('\n')
        const header = lines[0] || ''
        const content = lines.slice(1).join('\n')
        
        return (
          <div key={index} className="mb-4 p-3 border rounded-lg bg-muted/50">
            <div className="font-mono text-sm">
              <div className="font-bold text-blue-600 mb-2">{header}</div>
              <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                {content}
              </pre>
            </div>
          </div>
        )
      })
  }

  if (hasError) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Logs</h3>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhook Logs</h1>
          <p className="text-muted-foreground">
            View and manage webhook request logs for debugging and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshLogs}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            onClick={clearLogs}
            disabled={clearing}
          >
            <Trash2 className={`h-4 w-4 mr-2 ${clearing ? 'animate-spin' : ''}`} />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Log Statistics */}
      {logData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Log Entries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logData.totalLines}</div>
              <p className="text-xs text-muted-foreground">
                Log entries available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Log File</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono break-all">
                {logData.logFilePath || 'No file path available'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current log file location
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Badge variant={logData.success ? "default" : "destructive"}>
                {logData.success ? "Active" : "Error"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {logData.success ? "Logging is active and working" : "Logging has issues"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Webhook Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logData && logData.logs ? (
            <div className="max-h-96 overflow-y-auto">
              {formatLogs(logData.logs)}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Logs Available</h3>
              <p className="text-sm text-muted-foreground">
                No webhook logs have been generated yet. Try sending a webhook request to see logs appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
