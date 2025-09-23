"use client"

import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <Loader2
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      style={{color: '#3ECF8E'}}
    />
  )
}

interface LoadingOverlayProps {
  message?: string
  isVisible: boolean
}

export function LoadingOverlay({ message = 'Caricamento...', isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" />
          <span className="text-lg font-medium" style={{color: '#11181C'}}>
            {message}
          </span>
        </div>
      </div>
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Caricamento...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-lg font-medium" style={{color: '#687076'}}>
          {message}
        </p>
      </div>
    </div>
  )
}

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${height} ${width} ${className}`}
      style={{backgroundColor: '#E5E7EB'}}
    />
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="flex-1" height="h-12" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-4" style={{borderColor: '#EAEDF0'}}>
      <Skeleton height="h-6" width="w-3/4" />
      <Skeleton height="h-4" width="w-1/2" />
      <div className="space-y-2">
        <Skeleton height="h-4" />
        <Skeleton height="h-4" />
        <Skeleton height="h-4" width="w-5/6" />
      </div>
    </div>
  )
}