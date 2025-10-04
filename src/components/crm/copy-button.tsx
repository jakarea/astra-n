"use client"

import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'

interface CopyButtonProps {
  text: string
  className?: string
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-6 w-6 p-0 ${className}`}
      onClick={handleCopy}
      title={`Copy ${text}`}
    >
      <Copy className="h-3 w-3" />
    </Button>
  )
}