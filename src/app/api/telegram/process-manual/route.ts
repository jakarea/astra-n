import { NextRequest, NextResponse } from 'next/server'
import { telegramQueue } from '@/lib/telegram-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Manual Telegram queue processor
 * This endpoint can be called manually or by external services
 * to process pending Telegram notifications immediately
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Manual Telegram queue processor triggered')
    
    // Process the queue
    await telegramQueue.processQueue()
    
    // Get queue stats
    const stats = await telegramQueue.getStats()
    
    console.log('📊 Manual queue processing completed:', stats)
    
    return NextResponse.json({
      success: true,
      message: 'Telegram queue processed successfully',
      stats,
      triggeredBy: 'manual'
    })
    
  } catch (error: any) {
    console.error('❌ Manual Telegram queue processor error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process Telegram queue',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Get queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await telegramQueue.getStats()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Use POST to trigger manual processing'
    })
    
  } catch (error: any) {
    console.error('❌ Failed to get queue stats:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error.message
    }, { status: 500 })
  }
}
