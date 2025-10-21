import { NextRequest, NextResponse } from 'next/server'
import { telegramQueue } from '@/lib/telegram-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Process Telegram notification queue
 * This endpoint can be called by Vercel Cron Jobs or manually
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Telegram queue processor started')
    
    // Process the queue
    await telegramQueue.processQueue()
    
    // Get queue stats
    const stats = await telegramQueue.getStats()
    
    console.log('📊 Telegram queue stats:', stats)
    
    return NextResponse.json({
      success: true,
      message: 'Telegram queue processed successfully',
      stats
    })
    
  } catch (error: any) {
    console.error('❌ Telegram queue processor error:', error)
    
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
      stats
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
