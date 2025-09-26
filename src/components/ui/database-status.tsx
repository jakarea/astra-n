"use client"

import { Badge } from '@/components/ui/badge'
import { Database, AlertCircle, CheckCircle } from 'lucide-react'

interface DatabaseStatusProps {
  isConnected: boolean
  isUsingMockData: boolean
}

export function DatabaseStatus({ isConnected, isUsingMockData }: DatabaseStatusProps) {
  if (isUsingMockData) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        <AlertCircle className="h-4 w-4" />
        <span>Using demo data (database not connected)</span>
        <Badge variant="outline" className="text-xs">DEMO</Badge>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-3 py-2">
        <CheckCircle className="h-4 w-4" />
        <span>Database connected</span>
        <Badge variant="outline" className="text-xs">LIVE</Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
      <AlertCircle className="h-4 w-4" />
      <span>Database connection failed</span>
      <Badge variant="destructive" className="text-xs">ERROR</Badge>
    </div>
  )
}